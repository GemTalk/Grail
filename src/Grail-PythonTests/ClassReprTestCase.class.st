Class {
	#name : 'ClassReprTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassReprTestCase >> assertMatchesCPythonAt: key [
	"Compare through repr, so a string and a tuple of booleans stay
	distinguishable."

	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
ClassReprTestCase >> setUp [
	"Reload tests/python/class_repr.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_repr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_repr.py')
		name: 'class_repr'.

]

{ #category : 'Grail-Tests - Builtins' }
ClassReprTestCase >> testABuiltinClassRepsAsItsPythonNameWithNoModule [
	"The module is omitted for ``builtins'' EXACTLY -- that is what makes
	``int'' read ``<class 'int'>'' while a user class carries its module, and
	a fix that always qualified would get every builtin wrong in a new way.

	Also the case that exposed the SMALLTALK name: ``int'' is Integer here and
	``str'' is Unicode7, and both of those were what repr printed."

	self assertMatchesCPythonAt: 'int'.
	self assertMatchesCPythonAt: 'str'.
	self assertMatchesCPythonAt: 'list'.
	self assertMatchesCPythonAt: 'dict'.
	self assertMatchesCPythonAt: 'bool'.

]

{ #category : 'Grail-Tests - Metaclass' }
ClassReprTestCase >> testAMetaclassReprWins [
	"The older defect, found by this fixture rather than by inspection.
	``repr(C)'' is ``type(C).__repr__(C)'', but Grail MODELS the metaclass
	relation instead of making it the Smalltalk metaclass, so a bare send
	walks the Smalltalk chain and never reaches the metaclass method.  It was
	skipped before this change too -- adding the default class repr did not
	break it, and would have masked it permanently."

	self assertMatchesCPythonAt: 'metaclass_repr_wins'.

]

{ #category : 'Grail-Tests - User Classes' }
ClassReprTestCase >> testANestedClassUsesItsQualname [
	"__qualname__, not __name__: an inner class reads ``Outer.Inner''.  The
	two differ only for nested classes, so this is the case that says which
	one is being read."

	self assertMatchesCPythonAt: 'nested_class_uses_qualname'.

]

{ #category : 'Grail-Tests - Instances Unaffected' }
ClassReprTestCase >> testAnInstanceKeepsTheInstanceRepr [
	"Confusing a class with an instance of its metaclass is the mistake being
	fixed; these are the same mistake in the other direction.  An instance
	repr DOES carry an address, and a user __repr__ still wins for one."

	self assertMatchesCPythonAt: 'instance_with_own_repr'.
	self assertMatchesCPythonAt: 'instance_default_repr_shape'.
	self assertMatchesCPythonAt: 'instance_of_builtin'.
	self assertMatchesCPythonAt: 'instance_of_list'.
	self assertMatchesCPythonAt: 'class_and_instance_differ'.

]

{ #category : 'Grail-Tests - User Classes' }
ClassReprTestCase >> testAUserClassIsQualifiedByItsModule [
	self assertMatchesCPythonAt: 'own_class'.
	self assertMatchesCPythonAt: 'own_subclass'.
	self assertMatchesCPythonAt: 'class_with_metaclass'.
	self assertMatchesCPythonAt: 'the_metaclass'.

]

{ #category : 'Grail-Tests - User Classes' }
ClassReprTestCase >> testEveryStringifyingSpellingAgrees [
	"str(), format(), ``%s'' and an f-string all reach the same place, and
	nesting a class inside a list or dict reprs it through the container's
	own repr.  Listed because the old output was most often met through one
	of these rather than through repr() itself."

	self assertMatchesCPythonAt: 'str_of_class'.
	self assertMatchesCPythonAt: 'format'.
	self assertMatchesCPythonAt: 'percent_s'.
	self assertMatchesCPythonAt: 'fstring'.
	self assertMatchesCPythonAt: 'in_a_list'.
	self assertMatchesCPythonAt: 'in_a_dict_value'.

]

{ #category : 'Grail-Tests - Builtins' }
ClassReprTestCase >> testTypeAndObjectAndTheExceptionsAreNoDifferent [
	"type and object are classes like any other, and an exception class is the
	one most likely to appear in a message a user reads."

	self assertMatchesCPythonAt: 'type_itself'.
	self assertMatchesCPythonAt: 'object_itself'.
	self assertMatchesCPythonAt: 'Exception'.
	self assertMatchesCPythonAt: 'ValueError'.

]

{ #category : 'Grail-Tests - Builtins' }
ClassReprTestCase >> testTypeOfAnInstanceIsTheSameString [
	"``print(type(x))'' is how the old output was usually met, so it is worth
	pinning by that route as well as through repr on the class name."

	self assertMatchesCPythonAt: 'type_of_an_int'.
	self assertMatchesCPythonAt: 'type_of_a_str'.

]
