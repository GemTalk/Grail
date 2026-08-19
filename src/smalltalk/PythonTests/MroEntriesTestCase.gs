! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MroEntriesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
MroEntriesTestCase comment:
'PEP 560: a non-class base is replaced by its __mro_entries__.

The hook is handed the WHOLE original bases tuple, not just itself, because a
base may want to know what it is sitting among.  Its answer is spliced in at
that position, and an EMPTY tuple removes the base entirely.
__orig_bases__ preserves what was written, and is set ONLY when the hook
actually fired -- an ordinary class does not have the attribute at all, which
is worth pinning because "always set it" is easier to implement and wrong.

Grail never called the hook.  The non-class object stayed in __bases__, and a
class definition only succeeded because Grail happens to pick a class-shaped
base to inherit from; a SOLE non-class base failed outright.  Resolution now
happens in importlib ___registerBases___ -- the one place a class''s true bases
are decided, which is what __bases__ and __mro__ both read -- and
object >> ___subclass___ handles the sole-base path, generalising what
PyGenericAlias already did for itself.

WHAT THIS DELIBERATELY DOES NOT DO: make __bases__ and __mro__ answer tuples.
CPython''s are tuples and Grail''s are Arrays, and correcting that fixes five
assertions in test_genericclass -- but it also breaks isinstance.  builtins
___abstractBases___ implements CPython''s abstract_get_bases, which admits any
object whose __bases__ IS A TUPLE as an old-style class; Grail''s Arrays were
silently what kept INSTANCES out of that path, because Grail lets an instance
read its class''s __bases__ where CPython does not.  Measured: test_isinstance
0 -> 2 failures plus a SUnit failure.  The tuple change is right and wants the
attribute-lookup fix first.

See tests/python/mro_entries.py.'
%

expectvalue /Class
doit
MroEntriesTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
MroEntriesTestCase removeAllMethods: 0.
MroEntriesTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: MroEntriesTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'mro_entries' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/mro_entries.py')
		name: 'mro_entries'.
%

category: 'Grail-Helpers'
method: MroEntriesTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: MroEntriesTestCase
assertAll: keys
	keys do: [:each | self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests'
method: MroEntriesTestCase
testANonClassBaseIsReplaced
	"Spliced in at its own position, with the other bases untouched."

	self assertAll: #('non_class_base_is_replaced' 'replacement_is_a_real_base'
		'other_bases_survive')
%

category: 'Grail-Tests'
method: MroEntriesTestCase
testASoleNonClassBaseWorks
	"The path that used to raise ``cannot subclass a non-class base'': codegen
	sends ___subclass___ straight to the object it was given."

	self assertAll: #('a_sole_non_class_base_works')
%

category: 'Grail-Tests'
method: MroEntriesTestCase
testAnEmptyAnswerRemovesTheBase
	"``class D(A, c)'' where c contributes nothing is just ``class D(A)''."

	self assertAll: #('an_empty_answer_removes_the_base')
%

category: 'Grail-Tests'
method: MroEntriesTestCase
testTheHookReceivesTheWholeBasesTuple
	"Not just itself -- a base may want to know what it is sitting among."

	self assertAll: #('hook_receives_the_whole_original_bases_tuple'
		'hook_receives_a_tuple')
%

category: 'Grail-Tests'
method: MroEntriesTestCase
testOrigBasesIsRecordedOnlyWhenTheHookFired
	"An ordinary class has no __orig_bases__ at all."

	self assertAll: #('orig_bases_preserves_what_was_written'
		'an_ordinary_class_has_no_orig_bases')
%

category: 'Grail-Tests - unchanged'
method: MroEntriesTestCase
testOrdinaryClassCreationIsUnaffected
	"Base resolution runs for EVERY class definition, so single and multiple
	inheritance and instance creation are cover here, not decoration."

	self assertAll: #('ordinary_single_inheritance'
		'ordinary_multiple_inheritance' 'instances_still_build')
%
