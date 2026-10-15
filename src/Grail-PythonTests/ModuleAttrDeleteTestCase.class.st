Class {
	#name : 'ModuleAttrDeleteTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ModuleAttrDeleteTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
ModuleAttrDeleteTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_attr_delete' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_attr_delete.py')
		name: 'module_attr_delete'.

]

{ #category : 'Grail-Tests - the delete takes effect' }
ModuleAttrDeleteTestCase >> testAMethodBackedAttributeReallyGoes [
	"It used to report success and leave the attribute there.  Both
	enumerations and the read agree it is gone, and the AttributeError says
	so in CPython's words."

	self assertMatchesCPythonAt: 'gone_from_hasattr_and_dir'.
	self assertMatchesCPythonAt: 'reading_it_raises'.

]

{ #category : 'Grail-Tests - the delete takes effect' }
ModuleAttrDeleteTestCase >> testAssignmentRevivesIt [
	"The half that needed three tries.  An assignment does not always store
	where the read looks -- sys.stdout has an accessor PAIR, so assigning it
	performs the setter and writes neither store -- so the mark is cleared on
	the STORE rather than ordered around in the read.  And the store a module
	assignment makes is __setattr__, not ___pyAttrStore___."

	self assertMatchesCPythonAt: 'assignment_revives_it'.

]

{ #category : 'Grail-Tests - Controls' }
ModuleAttrDeleteTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '10 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - what it is for' }
ModuleAttrDeleteTestCase >> testInputRefusesOnceAStreamIsGone [
	"CPython's ``RuntimeError: lost sys.stdout''.  input() could not raise it
	while the delete was a no-op: the stream was still there."

	self assertMatchesCPythonAt: 'input_lost_stdout'.
	self assertMatchesCPythonAt: 'input_lost_stdin'.
	self assertMatchesCPythonAt: 'input_after_reviving'.

]

{ #category : 'Grail-Tests - Controls' }
ModuleAttrDeleteTestCase >> testOrdinaryInputIsUnaffected [
	"THE CONTROL FOR THE GUARD'S KEY.  Grail initialises sys.stdin and
	sys.stdout to None and reads the console through its own provider when
	they are, so keying ``lost'' on None -- which is what CPython does --
	would refuse every ordinary interactive input().  It keys on DELETED."

	self assertMatchesCPythonAt: 'ordinary_input_unaffected'.

]

{ #category : 'Grail-Tests - Controls' }
ModuleAttrDeleteTestCase >> testTheOtherDeleteShapesAreUnchanged [
	"A name that was never there is still refused, an ordinary value
	attribute still deletes and comes back, and the module still works
	afterwards -- the tombstone is per name, not a flag on the module."

	self assertMatchesCPythonAt: 'delete_missing_name'.
	self assertMatchesCPythonAt: 'delete_a_value_attribute'.
	self assertMatchesCPythonAt: 'module_still_usable'.

]
