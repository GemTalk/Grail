Class {
	#name : 'MethodFunctionDelegationTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MethodFunctionDelegationTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
MethodFunctionDelegationTestCase >> setUp [
	"Reload tests/python/method_function_delegation.py fresh each test.  Every
	probe builds its own class through ``fresh()'', but the module body has
	already run them all at import, and the UnboundMethod handles it tagged are
	interned for the session -- so a shared instance would let one test read
	another's replacement __dict__."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'method_function_delegation' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_function_delegation.py')
		name: 'method_function_delegation'.

]

{ #category : 'Grail-Tests - Writes On The Method Do Not Happen' }
MethodFunctionDelegationTestCase >> testAnArbitraryWriteOnTheMethodRaises [
	"A method has no attribute storage, so ``fi.a.x = 1'' is a mistake worth
	reporting rather than a write to keep somewhere nothing reads back."

	self assertMatchesCPythonAt: 'set_arbitrary_on_method'.
	self assertMatchesCPythonAt: 'del_arbitrary_on_method'.

]

{ #category : 'Grail-Tests - Reads Delegate' }
MethodFunctionDelegationTestCase >> testAnAttributeSetOnTheFunctionIsReadableThroughTheMethod [
	"The decorator idiom, both ends: tag the function in the class body, read
	the tag off an instance's bound method.  This is what silently lost data --
	the write succeeded and the read said the attribute did not exist."

	self assertMatchesCPythonAt: 'attr_set_on_the_function'.
	self assertMatchesCPythonAt: 'dict_sees_a_later_write'.
	self assertMatchesCPythonAt: 'dir_of_the_method_lists_it'.

]

{ #category : 'Grail-Tests - Replacing The Functions Dict' }
MethodFunctionDelegationTestCase >> testAssignmentInstallsTheCallersOwnMapping [
	"``F.a.__dict__ = d'' makes ``d'' the namespace, checked with ``is'' on both
	handles.  Grail stored a dynamic slot spelled __dict__ instead and left the
	real storage in place, so the mapping was never consulted again."

	self assertMatchesCPythonAt: 'replace_installs_that_mapping'.
	self assertMatchesCPythonAt: 'replace_is_visible_from_the_method'.

]

{ #category : 'Grail-Tests - Reads Delegate' }
MethodFunctionDelegationTestCase >> testDelegationStopsAtAnHonestMiss [
	"Delegating every miss to the function must not turn a genuine miss into a
	value.  A name neither carries is still an AttributeError."

	self assertMatchesCPythonAt: 'attr_never_set'.

]

{ #category : 'Grail-Tests - Replacing The Functions Dict' }
MethodFunctionDelegationTestCase >> testEveryAttributeOperationGoesThroughTheReplacement [
	"Installing it is only half: once ``d'' IS the namespace, reads, writes and
	deletes have to land in ``d''.  A replacement the attribute path ignored
	would satisfy the identity check on the next line and diverge on the one
	after."

	self assertMatchesCPythonAt: 'read_goes_through_the_replacement'.
	self assertMatchesCPythonAt: 'write_goes_through_the_replacement'.
	self assertMatchesCPythonAt: 'delete_goes_through_the_replacement'.

]

{ #category : 'Grail-Tests - Writes On The Method Do Not Happen' }
MethodFunctionDelegationTestCase >> testTheDescriptorsTheMethodTypeOwnsRefuseDifferently [
	"CPython uses a DIFFERENT message for the three names the method type
	exposes -- ``attribute '__doc__' of 'method' objects is not writable'' --
	because those attributes exist and simply have no setter, which is not the
	same complaint as a name the object has never heard of.  And __class__ is a
	TypeError rather than an AttributeError in both directions, because the
	store reaches object.__setattr__, which FINDS the slot descriptor and
	rejects the value."

	self assertMatchesCPythonAt: 'set_doc_on_method'.
	self assertMatchesCPythonAt: 'set_class_on_method'.
	self assertMatchesCPythonAt: 'del_class_on_method'.

]

{ #category : 'Grail-Tests - Replacing The Functions Dict' }
MethodFunctionDelegationTestCase >> testTheFunctionRulesApplyToAClassBodyDef [
	"An unbound handle is a FUNCTION, so it takes the function WRITE rules --
	the same ones a closure and a module-level def take.  It took none at all:
	a non-mapping __dict__ and an integer __name__ were both accepted.  Deleting
	__dict__ is a TypeError rather than an AttributeError, because what CPython
	refuses is the deletion of an attribute that exists."

	self assertMatchesCPythonAt: 'replace_with_a_non_dict'.
	self assertMatchesCPythonAt: 'delete_the_dict'.
	self assertMatchesCPythonAt: 'rename_the_function_to_an_int'.

]

{ #category : 'Grail-Tests - Reads Delegate' }
MethodFunctionDelegationTestCase >> testTheMethodReportsTheFunctionsDocstring [
	"``F.a.__doc__ = docstr'' has to be visible as ``fi.a.__doc__''.  CPython
	keeps one docstring, on the function, and the method merely reports it;
	Grail's method looked only in the class's compiled doc table and so ignored
	an assignment entirely."

	self assertMatchesCPythonAt: 'doc_assigned_on_the_function'.
	self assertMatchesCPythonAt: 'doc_absent_is_none'.

]

{ #category : 'Grail-Tests - Reads Delegate' }
MethodFunctionDelegationTestCase >> testTheMethodsDictIsTheFunctionsDict [
	"Not a copy and not a fresh view per read: the SAME object, which is how
	CPython code checks that two handles share a namespace."

	self assertMatchesCPythonAt: 'dict_is_the_functions_dict'.

]

{ #category : 'Grail-Tests - The Method Is Not The Function' }
MethodFunctionDelegationTestCase >> testTheMethodsFunctionIsTheClassHandle [
	"THE TEST THIS EXISTS FOR.  ``fi.a.__func__'' is ``F.a'' -- the same object
	the class hands out, not the bound handle answering itself.  Everything
	below follows from it: with the method as its own function there is no
	second object for storage to live on."

	self assertMatchesCPythonAt: 'func_is_the_class_handle'.
	self assertMatchesCPythonAt: 'self_is_the_receiver'.

]
