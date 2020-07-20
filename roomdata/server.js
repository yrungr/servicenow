(function() {
	// get the room sysid from the url parmaters
	var roomSysid = $sp.getParameter('sysid');
	roomSysid = '99dcf36a2b45820054a41bc5a8da1596';
	var basicRoomData = {};
	var unsortedHardware = [];
	var rackGeometryData = {};
	var finalData = {};

	// generate room plan
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
					model_rack_units: grAlmHardware.model.rack_units.getValue(),
					parent_sys_id: grAlmHardware.parent.sys_id.getValue(),
					serial_number: grAlmHardware.serial_number.getValue(),
					support_group_manager_email: grAlmHardware.support_group.manager.email.getValue(),
					support_group_name: grAlmHardware.support_group.name.getValue(),
					support_group_u_slack_channel: grAlmHardware.support_group.u_slack_channel.getValue(),
					sys_class_name: grAlmHardware.sys_class_name.getValue(),
					sys_id: grAlmHardware.sys_id.getValue(),
					u_rack_u: grAlmHardware.u_rack_u.getValue(),
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
		var tempHardware = [];
		var rackName = '';
		var rackSysid = '';
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
			finalData['ROOM']['racks'][rack] = {};
			finalData['ROOM']['racks'][rack]['name'] = rackName;
			finalData['ROOM']['racks'][rack]['sys_id'] = rackSysid;
			finalData['ROOM']['racks'][rack]['rackmounted'] = {};
			finalData['ROOM']['racks'][rack]['unsorted'] = {};
			finalData['ROOM']['racks'][rack]['xpos'] = rackGeometryData[rackSysid]['xpos'];
			finalData['ROOM']['racks'][rack]['ypos'] = rackGeometryData[rackSysid]['ypos'];
			finalData['ROOM']['racks'][rack]['xsize'] = rackGeometryData[rackSysid]['xsize'];
			finalData['ROOM']['racks'][rack]['ysize'] = rackGeometryData[rackSysid]['ysize'];
			tempHardware = processRackHardware(unsortedHardware,rackSysid);
			finalData['ROOM']['racks'][rack]['rackmounted'] = tempHardware[0];
			finalData['ROOM']['racks'][rack]['pdu'] = tempHardware[1];
			finalData['ROOM']['racks'][rack]['unmatched'] = tempHardware[2];
			finalData['ROOM']['racks'][rack]['orphans'] = tempHardware[3];
		})
		return finalData;
	}
	
	function processRackHardware(unsortedHardware,rackSysid){
		var foo = [];
		var blah = [];
    var rackMounted = [];
    var uncheckedChildren = [];
    var children = [];
    var unmatched = {};
		var rackData = {};
		var pduData = {};
		var objectName = '';
		var rackMountedSysidList = [];
		var tempHardware = [];
		var prefix = '';
		var rackmountName = '';
		var childName = '';
		var unmatchedName = '';
		var tempChildren = [];
		var orphans = {};
		var orphanName = '';
		
		/*
					asset_tag: grAlmHardware.asset_tag.getValue(),
					ci_name: grAlmHardware.ci.name.getValue(),
					ci_u_cmdb_ci_status_name: grAlmHardware.ci.u_cmdb_ci_status.name.getValue(),
					ci_u_provision_date: grAlmHardware.ci.u_provision_date.getValue(),
					model_category_name: grAlmHardware.model_category.name.getValue(),
					model_name: grAlmHardware.model.name.getValue(),
					model_rack_units: grAlmHardware.model.rack_units.getValue(),
					parent_sys_id: grAlmHardware.parent.sys_id.getValue(),
					serial_number: grAlmHardware.serial_number.getValue(),
					support_group_manager_email: grAlmHardware.support_group.manager.email.getValue(),
					support_group_name: grAlmHardware.support_group.name.getValue(),
					support_group_u_slack_channel: grAlmHardware.support_group.u_slack_channel.getValue(),
					sys_class_name: grAlmHardware.sys_class_name.getValue(),
					sys_id: grAlmHardware.sys_id.getValue(),
					u_rack_u: grAlmHardware.u_rack_u.getValue(),
					u_slot: grAlmHardware.u_slot.getValue(),
					u_rack_name: grAlmHardware.u_rack.name.getValue(),
					u_rack_sys_id: grAlmHardware.u_rack.sys_id.getValue(),
					u_smdb_table: grAlmHardware.u_smdb_table.getValue(),
					u_last_audit_date: grAlmHardware.u_last_audit_date.getValue()
	*/
		// process hardware
		unsortedHardware.forEach(function(hardware){
			if (hardware['u_rack_sys_id'] == rackSysid){
				tempHardware.push(hardware)
			}
		});
    tempHardware.forEach(function(hardwareCheck) {
      // server checks
      isValid = true;
      if (hardwareCheck['parent_sys_id']){
        isValid = false;
      }
      if (hardwareCheck['model_rack_units'] < 1){
        isValid = false;
      }
      if (!hardwareCheck['u_rack_u']){
        isValid = false;
      }
      if (hardwareCheck['u_rack_u'] < 1){
        isValid = false;
      }
      if (isValid){
        rackMounted.push(hardwareCheck);
      } else {
        // unchecked children
        if (hardwareCheck['parent_sys_id']){
          uncheckedChildren.push(hardwareCheck);
        } else {
					// rack pdu
					if (hardwareCheck['model_category_name'] == 'PDU'){
						pduData['PDU_' + hardwareCheck['sys_id']] = hardwareCheck;
					} else {
            // everything else
					  unmatchedName = 'UNMATCHED_' + hardwareCheck['sys_id'];
            unmatched[unmatchedName] = hardwareCheck;
					}
        }
      }
    });
    rackMounted.forEach(function(rackMount){
      rackMountedSysidList.push(rackMount['sys_id']);
    })
    uncheckedChildren.forEach(function(child){
      if (rackMountedSysidList.indexOf(child['parent_sys_id']) < 0){
			  if (child['model_category_name']){
				  prefix = 'ORPHAN_' + child['model_category_name'].toUpperCase().replace(" ", "_");
			  } else {
				  prefix = 'ORPHAN_UNCATEGORISED';
			  }
				orphanName = prefix + '_' + child['sys_id'];
        orphans[orphanName] = child;
      } else {
        children.push(child);
      }
    })
		// collision check rackmount objects
		rackMounted = rackmountCollisionTest(rackMounted);
		// combine rackmounted and children
		rackMounted.forEach(function(rackMount){
			if (rackMount['model_category_name']){
				prefix = 'RACKMOUNT_' + rackMount['model_category_name'].toUpperCase().replace(" ", "_");
			} else {
				prefix = 'RACKMOUNT_UNCATEGORISED';
			}
			rackmountName = prefix + '_' + rackMount['sys_id'];
			rackData[rackmountName] = rackMount;
			rackData[rackmountName]['children'] = {};
			children.forEach(function(child){
				if (child['parent_sys_id'] == rackMount['sys_id']){
					tempChildren.push(child);
				}
			});
			// collision test children
			tempChildren = childCollisionTest(tempChildren);
			// add tested children to rackmount
			tempChildren.forEach(function(child){
			    if (child['model_category_name']){
				    prefix = 'CHILD_' + child['model_category_name'].toUpperCase().replace(" ", "_");
			    } else {
				    prefix = 'CHILD_UNCATEGORISED';
			    }
					childName = prefix + '_' + child['sys_id'];
					rackData[rackmountName]['children'][childName] = child;
			});
		});
		return [rackData,pduData,unmatched,orphans];
	}
	
	function rackmountCollisionTest(rackMounted){
		var tested = [];
		rackMounted.forEach(function(object){
			object['collision'] = false;
			tested.push(object);
		});
		return tested;
	}
	
	function childCollisionTest(rackMounted){
		var tested = [];
		rackMounted.forEach(function(object){
			object['collision'] = false;
			tested.push(object);
		});
		return tested;
	}
		/*
		
		
		
		// get rack data

		// get alm_hardware data
		if (rackSysidList.length > 0){
			var grAsset = new GlideRecord('alm_hardware');
			grAsset.addQuery('u_rack', 'IN', rackSysidList);
			grAsset.query();
			while (grAsset.next()) {
				nodeData.push({
					name: grAsset.getDisplayValue('ci.name'),
					sysid: grAsset.getValue('sys_id'),
					modelheight: grAsset.getDisplayValue('model.rack_units'),
					product: grAsset.getDisplayValue('ci.u_product'),
					parent: grAsset.getValue('parent'),
					racku: grAsset.getValue('u_rack_u'),
					slot: grAsset.getValue('u_slot'),
					racksysid: grAsset.getValue('u_rack'),
					rackname: grAsset.getDisplayValue('u_rack')
				});
			}
		} else {
			roomName = 'This room is not configured for 3D.'
		}
		// sort alm_hardware data
		nodeData.forEach(function(node){
			// server checks
			serverValid = true;
			if (!node['racku']){
				serverValid = false;
			}
			if (node['racku'] == 0){
				serverValid = false;
			}
			if (!node['modelheight']){
				serverValid = false;
			}
			if (node['slot']){
				serverValid = false;
			}
			if (serverValid){
				temporaryServerData.push(node)
			} else {
				// sled checks
				sledValid = true;
				if (!node['slot']){
					sledValid = false;
				}
				if (!node['parent']){
					sledValid = false;
				}
				if (sledValid){
					sledData.push(node)
				} else {
					// store leftovers
					badData.push(node);
				}
			}
		});
		// process data
		rackData.forEach(function(rack){
			rackSysid = rack['rackSysid'];
			xpos = (parseInt(rack['xpos']) * 0.001);
			zpos = (parseInt(rack['ypos']) * 0.001);
			xsize = (parseInt(rack['xsize']) * 0.001);
			zsize = (parseInt(rack['ysize']) * 0.001);
			temporaryServerData.forEach(function(server){
				if (server['racksysid'] == rackSysid){
					if (server['product']){
						if (productData.indexOf(server['product']) < 0){
							productData.push(server['product']);
						}
					}
					ypos = (parseInt(server['racku']) * 0.0445).toFixed(3);
					ysize = (parseInt(server['modelheight']) * 0.0445).toFixed(3);
					sledProduct = [];
					sledData.forEach(function(sled){
						if (sled['parent'] == server['sysid']){
							if (sled['product']){
								if (productData.indexOf(sled['product']) < 0){
									productData.push(sled['product']);
								}
								if (sledProduct.indexOf(sled['product']) < 0){
									sledProduct.push(sled['product']);
								}
							}
						}
					});
					/////////////////////
					status = Math.floor(Math.random() * 5)
					status = 0;
					serverData.push({
						alm_hardware_sysid: server['sysid'],
						cmdb_ci_rack: rack['rackSysid'],
						xpos: xpos,
						ypos: ypos,
						zpos: zpos,
						xsize: xsize,
						ysize: ysize,
						zsize: zsize,
						product: server['product'],
						sledProduct: sledProduct,
						status: status
					});
				}
			});
		});
		data.roomName = roomName;
		data.rackData = rackData;
		data.serverData = serverData;
		data.productData = productData;
		data.badData = badData;
*/
		
})();