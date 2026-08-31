! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'TypedDictTotalTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
TypedDictTotalTestCase comment:
'``typing.TypedDict'' and the ``total'' CLASS KEYWORD.

``class Options(TypedDict, total=False)'' raised

    TypeError: object.__init_subclass__() takes no keyword arguments

and that message is why this test exists in typing rather than in the object
model.  PEP 487 routes a class header''s leftover keywords to
__init_subclass__, and object''s terminal hook rejects whatever nobody
consumed.  In CPython ``total'' is consumed by _TypedDictMeta.__new__, which
DECLARES it as a named parameter.  Grail''s TypedDict was a bare ``class
TypedDict: pass'', which declares nothing, so ``total'' survived to the end of
the chain and was reported against the object model.  Nothing about
__init_subclass__ was wrong -- the naive repro passed, as
docs/Package_Census.md notes.

Measured cost: it blocked pip''s filelock and pyjwt outright and three more
packages behind the typing gap, making it the third-ranked gap in that census.

The stand-in is now CPython''s shape -- a factory object carrying
__mro_entries__, a _TypedDictMeta that eats ``total'', and the
__required_keys__ / __optional_keys__ / __total__ / __annotations__ a consumer
reads back, including Required and NotRequired per-key overrides and the
functional TypedDict(''Name'', {...}) form.

TWO DIVERGENCES ARE DELIBERATE and are not asserted, because they are
consequences of Grail''s object model rather than of this file: a TypedDict
class here is a real dict SUBCLASS, so calling it answers an instance of that
subclass where CPython answers a plain dict (CPython gets that from
``_TypedDictMeta.__call__ = dict'', and Grail does not consult a metaclass
__call__ -- measured); and __mro__ carries one extra link, _TypedDictBase.
Both are recorded in docs/Issues.md.

See tests/python/typed_dict_total.py.'
%

expectvalue /Class
doit
TypedDictTotalTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
TypedDictTotalTestCase removeAllMethods: 0.
TypedDictTotalTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: TypedDictTotalTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'typed_dict_total' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/typed_dict_total.py')
		name: 'typed_dict_total'.
%

category: 'Grail-Helpers'
method: TypedDictTotalTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: TypedDictTotalTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - the class keyword'
method: TypedDictTotalTestCase
testTotalIsConsumed
	"The gap itself: ``total='' reached object.__init_subclass__ and was
	rejected there."

	self assertAll: #(
		'total_defaults_true'
		'total_false_is_honoured'
		'total_is_per_class_not_inherited')
%

category: 'Grail-Tests - the class keyword'
method: TypedDictTotalTestCase
testAnUnrelatedClassKeywordIsStillRejected
	"The metaclass declares ``total'' and NOTHING else -- no **kwargs -- so a
	typo beside it is still PEP 487''s TypeError.  A catch-all would have
	fixed the gap by making this the one class in the language where a
	misspelt class keyword is silently accepted."

	self assertAll: #('an_unrelated_class_keyword_is_still_rejected')
%

category: 'Grail-Tests - the key sets'
method: TypedDictTotalTestCase
testRequiredAndOptionalKeys
	self assertAll: #(
		'required_keys_when_total'
		'optional_keys_when_total'
		'required_keys_when_not_total'
		'optional_keys_when_not_total')
%

category: 'Grail-Tests - the key sets'
method: TypedDictTotalTestCase
testASubclassAccumulatesFromItsBases
	self assertAll: #(
		'a_subclass_keeps_the_bases_optional_keys'
		'a_subclass_adds_its_own_required_keys'
		'annotations_include_the_inherited_keys')
%

category: 'Grail-Tests - the key sets'
method: TypedDictTotalTestCase
testRequiredAndNotRequiredOverrideTotal
	"Grail''s annotations are the SOURCE TEXT, not an evaluated alias, so the
	qualifier is read off the leading name.  A qualifier can only appear
	outermost, which is what makes that a rule rather than a parse."

	self assertAll: #(
		'not_required_overrides_total'
		'not_required_leaves_the_rest_required'
		'required_overrides_total_false'
		'required_leaves_the_rest_optional')
%

category: 'Grail-Tests - what it is'
method: TypedDictTotalTestCase
testATypedDictIsADict
	self assertAll: #('a_typed_dict_is_a_dict' 'an_instance_equals_the_plain_dict')
%

category: 'Grail-Tests - what it is'
method: TypedDictTotalTestCase
testInstanceChecksAreRefused
	"``TypedDict does not support instance and class checks'' -- typed dicts
	are for static structural subtyping only."

	self assertAll: #('instance_checks_are_refused')
%

category: 'Grail-Tests - the functional form'
method: TypedDictTotalTestCase
testTheFunctionalForm
	self assertAll: #('the_functional_form_works' 'the_functional_form_takes_total')
%
