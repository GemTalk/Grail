Class {
	#name : 'FrameGlobalsOutsideSysModulesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
FrameGlobalsOutsideSysModulesTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
FrameGlobalsOutsideSysModulesTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
FrameGlobalsOutsideSysModulesTestCase >> setUp [

	importlib @env1:modules removeKey: #'frame_globals_outside_sys_modules' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/frame_globals_outside_sys_modules.py')
		name: 'frame_globals_outside_sys_modules'

]

{ #category : 'Grail-Tests - f_globals' }
FrameGlobalsOutsideSysModulesTestCase >> testAModuleOutsideSysModulesKeepsItsGlobals [

	self assertAll: #('a_module_removed_from_sys_modules' 'every_frame_still_has_globals'
		'a_module_replaced_in_sys_modules' 'a_live_frame_read_after_removal')

]

{ #category : 'Grail-Tests - f_globals' }
FrameGlobalsOutsideSysModulesTestCase >> testARegisteredModuleIsUnchanged [

	self assertAll: #('a_registered_module' 'after_it_is_restored')

]

{ #category : 'Grail-Tests - f_globals' }
FrameGlobalsOutsideSysModulesTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: (self results @env1:__len__) equals: 6

]
