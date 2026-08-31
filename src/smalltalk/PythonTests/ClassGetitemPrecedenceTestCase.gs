! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ClassGetitemPrecedenceTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ClassGetitemPrecedenceTestCase comment:
'Who answers ``C[x]'': the metatype first, then the class''s own hook.

Two independent ways the PEP 560 dispatch was bypassed, both of them
because something sat AHEAD of it.

A METACLASS __getitem__ was never consulted.  CPython evaluates
``C[int]'' as ``type(C).__getitem__(C, int)'' when the metatype defines
one, falling back to ``C.__class_getitem__(int)'' only when it does not
-- so the metaclass outranks the class''s own hook and applies to a class
with no hook at all.  Grail RECORDS a metaclass rather than building the
class through it, so nothing made that consult happen: the hook was
dead, and a metaclass-only class answered ITSELF.  Metaclass3 >>
___grailClassGetitemDispatch___: now asks the recorded metaclass first,
treating ``an owner other than type''s own'' as the test for a genuine
override so the check self-adjusts instead of naming a base class.

A BUILT-IN''s class-side subscript shortcut swallowed the dispatch for
its own subclasses.  dict answers the class (so ``class N(dict[str,
Foo])'' works); list and functools.partial answer a real GenericAlias.
All three sit on the metaclass chain ahead of the dispatcher, so a
subclass defining __class_getitem__ never ran it.  Each now defers when
-- and only when -- a hook actually exists, which keeps ``dict[K, V]''
and ``list[int]'' on their original paths.  Only dict is covered by a
corpus test; list and partial are the same shape, and leaving them
disagreeing is how the next one gets found the hard way.

Took test.test_genericclass 6 -> 4.  The two survivors named
``with_builtins'' need a builtin''s __mro__ to end at object, which
importlib class >> ___withoutImplementationRoots___:for: documents as a
deliberately scoped-out design decision (it means deciding, per builtin,
where the Python type ends) rather than a bug.

See tests/python/class_getitem_precedence.py (15 checks,
CPython-validated first).'
%

expectvalue /Class
doit
ClassGetitemPrecedenceTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ClassGetitemPrecedenceTestCase removeAllMethods: 0.
ClassGetitemPrecedenceTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassGetitemPrecedenceTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_getitem_precedence' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_getitem_precedence.py')
		name: 'class_getitem_precedence'.
%

category: 'Grail-Helpers'
method: ClassGetitemPrecedenceTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ClassGetitemPrecedenceTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: ClassGetitemPrecedenceTestCase
testTheMetatypeIsConsultedFirst
	"A metaclass __getitem__ beats the class's own hook, works with no
	class hook at all, and a metaclass WITHOUT one still defers to the
	class hook -- the boundary the owner test has to get right."

	self assertAll: #('metaclass_outranks_the_class_hook'
		'metaclass_hook_without_a_class_hook'
		'a_metaclass_without_getitem_defers')
%

category: 'Grail-Tests'
method: ClassGetitemPrecedenceTestCase
testBuiltinSubclassesGetTheirOwnHook
	"dict, list and functools.partial subclasses all reach a
	__class_getitem__ their base's shortcut used to swallow -- including
	through a further subclass, and without touching the base."

	self assertAll: #('dict_subclass_hook_not_yet_run'
		'dict_subclass_hook_runs' 'dict_subclass_hook_saw_the_index'
		'dict_subclass_hook_left_the_base_alone' 'list_subclass_hook_runs'
		'list_subclass_hook_saw_the_index' 'partial_subclass_hook_runs'
		'partial_subclass_hook_saw_the_index')
%

category: 'Grail-Tests'
method: ClassGetitemPrecedenceTestCase
testThePlainSpellingsAreUntouched
	"The shortcuts still answer for the built-ins themselves and for a
	subclass with no hook -- which is what they exist for."

	self assertAll: #('plain_dict_subscript_is_still_dict_ish'
		'plain_list_subscript_is_an_alias'
		'a_dict_subclass_without_a_hook_is_unchanged'
		'a_list_subclass_without_a_hook_still_aliases')
%
