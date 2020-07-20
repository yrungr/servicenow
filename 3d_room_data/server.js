(function() {
  // get the room sysid from the url parmaters
  var roomSysid = $sp.getParameter('sysid');
  roomSysid = '1ca188a9db71c7442b56541adc961915';
  var basicRoomData = {};
  var rackGeometryData = {};
  var unsortedHardware = ['foo'];
  var finalData = {};
  if (roomSysid){
    basicRoomData = generateBasicRoom(roomSysid);
    rackGeometryData = rackGeometry(basicRoomData,roomSysid);
    unsortedHardware = getHardWare(basicRoomData);
    finalData = generateFinalData(basicRoomData,rackGeometryData,unsortedHardware);
    data.output = finalData;
  } else {
    data.roomName = 'Room sysid was not supplied.';
    data.rackData = [];
    data.hardwareData = [];
  }

  /**
   * @function generateBasicRoom
   * @description generate basic room and rack data
   * @param {string} roomSysid - the room's servicenow sysid from url
   */
  function generateBasicRoom(roomSysid){
    var allData = {};
    var zoneSysid = [];
    var rackSysid = [];
    var roomName = '';
    var rackName = '';
    // find the room name
    var grRoom = new GlideRecord("cmdb_ci_computer_room");
    grRoom.get(roomSysid);
    grRoom.query();
    while (grRoom.next()){
      roomName = 'ROOM' + grRoom.name.getValue();
      allData['ROOM'] = {};
      allData['ROOM']['name'] = grRoom.name.getValue();
      allData['ROOM']['sys_id'] = grRoom.sys_id.getValue();
      allData['ROOM']['racks'] = {};
    }
    // find zones sys_ids in the room
    var grZoneRelation = new GlideRecord("cmdb_rel_ci");
    grZoneRelation.addQuery('parent', roomSysid);
    grZoneRelation.query();
    while (grZoneRelation.next()){
      zoneSysid.push(grZoneRelation.child.getValue());
    }
    // find rack sys_ids in the zones
    var grRackRelation = new GlideRecord("cmdb_rel_ci");
    grRackRelation.addQuery('parent', 'IN', zoneSysid);
    grRackRelation.query();
    while (grRackRelation.next()){
      rackSysid.push(grRackRelation.child.getValue());
    }
    // get rack data
    var grRack = new GlideRecord("cmdb_ci_rack");
    grRack.addQuery('sys_id', 'IN', rackSysid);
    grRack.query();
    while (grRack.next()){
      rackName = 'RACK_' + grRack.name.getValue();
      allData['ROOM']['racks'][rackName] = {};
      allData['ROOM']['racks'][rackName]['name'] = grRack.name.getValue();
      allData['ROOM']['racks'][rackName]['sys_id'] = grRack.sys_id.getValue();
    }
    return allData;
  }
  
  function rackGeometry(basicRoomData,roomSyid){
    var rackSysid = [];
    var geometryData = {};
    Object.keys(basicRoomData['ROOM']['racks']).forEach(function(rack){
      rackSysid.push(basicRoomData['ROOM']['racks'][rack]['sys_id']);
    })
    if (rackSysid.length > 0){
      var grRackMetadata = new GlideRecord("u_dcse_visualization_rack_metadata");
      grRackMetadata.addQuery("u_rack_sysid", 'IN', rackSysid);
      grRackMetadata.query();
      while (grRackMetadata.next()){
        rackSysid = grRackMetadata.getValue("u_rack_sysid");
        geometryData[rackSysid] = {};
        geometryData[rackSysid]['xpos'] = grRackMetadata.u_mm_x_pos.getValue();
        geometryData[rackSysid]['ypos'] = grRackMetadata.u_mm_y_pos.getValue();
        geometryData[rackSysid]['xsize'] = grRackMetadata.u_mm_x_size.getValue();
        geometryData[rackSysid]['ysize'] = grRackMetadata.u_mm_y_size.getValue();
      }
    }
    return geometryData;
  }
    
  function getHardWare(basicRoomData){
    var rackSysid = [];
    var hardwareData = [];
    Object.keys(basicRoomData['ROOM']['racks']).forEach(function(rack){
      rackSysid.push(basicRoomData['ROOM']['racks'][rack]['sys_id']);
    })
    if (rackSysid.length > 0){
      var grAlmHardware = new GlideRecord('alm_hardware');
      grAlmHardware.addQuery('u_rack', 'IN', rackSysid);
      grAlmHardware.addNullQuery('parent.sys_id');
      grAlmHardware.addQuery('model_category.name', 'DOES NOT CONTAIN', 'PDU');
      grAlmHardware.addQuery('u_rack_u', '>', 0);
      grAlmHardware.addNotNullQuery('u_rack_u');
      grAlmHardware.addNotNullQuery('model.rack_units');
      grAlmHardware.setLimit(1000);
      grAlmHardware.query();
      while (grAlmHardware.next()) {
        hardwareData.push({
          asset_tag: grAlmHardware.asset_tag.getValue(),
          ci_name: grAlmHardware.ci.name.getValue(),
          ci_u_cmdb_ci_status_name: grAlmHardware.ci.u_cmdb_ci_status.name.getValue(),
          ci_u_provision_date: grAlmHardware.ci.u_provision_date.getValue(),
          model_category_name: grAlmHardware.model_category.name.getValue(),
          model_name: grAlmHardware.model.name.getValue(),
          model_rack_units: parseInt(grAlmHardware.model.rack_units.getValue()),
          serial_number: grAlmHardware.serial_number.getValue(),
          support_group_manager_email: grAlmHardware.support_group.manager.email.getValue(),
          support_group_name: grAlmHardware.support_group.name.getValue(),
          support_group_u_slack_channel: grAlmHardware.support_group.u_slack_channel.getValue(),
          sys_class_name: grAlmHardware.sys_class_name.getValue(),
          sys_id: grAlmHardware.sys_id.getValue(),
          u_rack_u: parseInt(grAlmHardware.u_rack_u.getValue()),
          u_slot: grAlmHardware.u_slot.getValue(),
          u_rack_name: grAlmHardware.u_rack.name.getValue(),
          u_rack_sys_id: grAlmHardware.u_rack.sys_id.getValue(),
          u_smdb_table: grAlmHardware.u_smdb_table.getValue(),
          u_last_audit_date: grAlmHardware.u_last_audit_date.getValue()
        });
      }
    }
    return hardwareData;
  }
  
  function generateFinalData(basicRoomData,rackGeometryData,unsortedHardware){
    var finalData = {};
    var rackName = '';
    var rackSysid = '';
    var matchingHardware = [];
    var unitUsage = {};
    var testedHardware = {};
    // copy room data
    finalData['ROOM'] = {};
    finalData['ROOM']['sys_id'] = basicRoomData['ROOM']['sys_id'];
    finalData['ROOM']['name'] = basicRoomData['ROOM']['name'];
    finalData['ROOM']['name'] = basicRoomData['ROOM']['name'];
    finalData['ROOM']['racks'] = {};
    // copy and combine data
    Object.keys(basicRoomData['ROOM']['racks']).forEach(function(rack){
      rackName = basicRoomData['ROOM']['racks'][rack]['name'];
      rackSysid = basicRoomData['ROOM']['racks'][rack]['sys_id'];
      matchingHardware = findMatchingHardware(unsortedHardware,rackName);
      unitUsage = countRackUnitUsage(matchingHardware);
      testedHardware = processRackHardware(matchingHardware,unitUsage);
      finalData['ROOM']['racks'][rack] = {};
      finalData['ROOM']['racks'][rack]['name'] = rackName;
      finalData['ROOM']['racks'][rack]['sys_id'] = rackSysid;
      finalData['ROOM']['racks'][rack]['rackmounted'] = {};
      finalData['ROOM']['racks'][rack]['unsorted'] = {};
      finalData['ROOM']['racks'][rack]['xpos'] = rackGeometryData[rackSysid]['xpos'];
      finalData['ROOM']['racks'][rack]['ypos'] = rackGeometryData[rackSysid]['ypos'];
      finalData['ROOM']['racks'][rack]['xsize'] = rackGeometryData[rackSysid]['xsize'];
      finalData['ROOM']['racks'][rack]['ysize'] = rackGeometryData[rackSysid]['ysize'];
      finalData['ROOM']['racks'][rack]['rackmounted'] = testedHardware;
      finalData['ROOM']['racks'][rack]['unitUsage'] = unitUsage;
    })
    return finalData;
  }
  
  function findMatchingHardware(unsortedHardware,rackName){
    var matching = [];
    unsortedHardware.forEach(function(hardware){
      if (hardware['u_rack_name'] == rackName){
        matching.push(hardware)
      }
    });
    return matching;
  }
  
  function countRackUnitUsage(serverTemp){
    var unitLoop = 0;
    var unitUsage = {};
    serverTemp.forEach(function(tempRack){
      for (unitLoop = 0; unitLoop < tempRack['model_rack_units']; unitLoop++){
        unit = tempRack['u_rack_u'] + unitLoop;
        if (unit in unitUsage){
          unitUsage[unit] += 1;
        } else {
          unitUsage[unit] = 1;
        }
      }
    });
    return unitUsage;
  }
  
  function processRackHardware(matchingHardware,unitUsage){
    var collision = false;
    var output = {};
    var prefix = '';
    matchingHardware.forEach(function(rackMount){
      if (rackMount['model_category_name']){
        prefix = rackMount['model_category_name'].replace(" ", "_").toUpperCase();
      } else {
        prefix = 'UNCATEGORISED';
      }
      if (rackMount['model_category_name'] == "Out of Band Device"){
        prefix = 'OUT_OF_BAND_DEVICE';
      }
      output[prefix + '_' + rackMount['sys_id']] = rackMount;
      output[prefix + '_' + rackMount['sys_id']]['collision'] = serverCollisionTest(rackMount,unitUsage);
    });
    return [output];
  }
  
  function serverCollisionTest(server,rackUnitUsage){
    var unitCollision = false;
    var unit;
    for (unitLoop = 0; unitLoop < server['model_rack_units']; unitLoop++){
      unit = server['u_rack_u'] + unitLoop;
      if (rackUnitUsage[unit] > 1){
        unitCollision = true;
      }
    }
    return unitCollision;
  }
})();