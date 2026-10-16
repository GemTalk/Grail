! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FrameGlobalsOutsideSysModulesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FrameGlobalsOutsideSysModulesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FrameGlobalsOutsideSysModulesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FrameGlobalsOutsideSysModulesTestCase - f_globals does not depend on sys.modules
! ===============================================================================
! PyFrame >> f_globals finds a frame's module by co_filename.  It looked only
! in sys.modules, so a module that had been popped or replaced there answered
! None for every frame of its code, and pytest's unittest support ended the
! session with an INTERNALERROR reading ``f_globals.get('__unittest')''.  It
! now falls back to the session's module instances.
! tests/python/frame_globals_outside_sys_modules.py holds the 6 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FrameGlobalsOutsideSysModulesTestCase removeAllMethods.
FrameGlobalsOutsideSysModulesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FrameGlobalsOutsideSysModulesTestCase
setUp

	importlib @env1:modules removeKey: #'frame_globals_outside_sys_modules' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/frame_globals_outside_sys_modules.py')
		name: 'frame_globals_outside_sys_modules'
%

category: 'Grail-Helpers'
method: FrameGlobalsOutsideSysModulesTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: FrameGlobalsOutsideSysModulesTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - f_globals'
method: FrameGlobalsOutsideSysModulesTestCase
testAModuleOutsideSysModulesKeepsItsGlobals

	self assertAll: #('a_module_removed_from_sys_modules' 'every_frame_still_has_globals'
		'a_module_replaced_in_sys_modules' 'a_live_frame_read_after_removal')
%

category: 'Grail-Tests - f_globals'
method: FrameGlobalsOutsideSysModulesTestCase
testARegisteredModuleIsUnchanged

	self assertAll: #('a_registered_module' 'after_it_is_restored')
%

category: 'Grail-Tests - f_globals'
method: FrameGlobalsOutsideSysModulesTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: (self results @env1:__len__) equals: 6
%
