! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'Pep560BasesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
Pep560BasesTestCase comment:
'PEP 560: tuples for __bases__ / __mro__, and __orig_bases__ on the
sole-base path.

Two SHAPE bugs, both of which made correct machinery look broken.
``cls.__bases__'' and ``cls.__mro__'' answered a plain Smalltalk Array
where CPython answers a TUPLE, so every assertEqual against a tuple
failed however right the contents were -- most of test_genericclass''s
TestMROEntry.  A Grail tuple is an Array SUBCLASS, so every Smalltalk
reader is unaffected.

``__orig_bases__'' was recorded only on the MULTI-base path (importlib
___registerBases___).  The SOLE-base path -- the shape the protocol is
most used in, a generic alias normally being the only base -- recorded
nothing.  It now stashes the original tuple during ___subclass___: and
installs it from ___pyClassDefined___:, since at substitution time the
class exists but its ___dynInstVars___ holder does not (storing there was
an uncatchable does-not-understand).

The sole-base hook lookup also walks the TRUE MRO instead of the
Smalltalk superclass chain, so a hook inherited from a SECONDARY base is
found -- an MI class is one Smalltalk class whose superclass is only its
primary base.

Took test.test_genericclass from 10 failures to 8; the survivors are
diagnosed in docs/Issues.md.

See tests/python/pep560_bases.py (17 checks, CPython-validated first).'
%

expectvalue /Class
doit
Pep560BasesTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
Pep560BasesTestCase removeAllMethods: 0.
Pep560BasesTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: Pep560BasesTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'pep560_bases' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pep560_bases.py')
		name: 'pep560_bases'.
%

category: 'Grail-Helpers'
method: Pep560BasesTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: Pep560BasesTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: Pep560BasesTestCase
testBasesAndMroAreTuples
	"Both accessors answer real tuples, with the right contents, and
	``mro()'' stays a list as CPython has it."

	self assertAll: #('bases_is_a_tuple' 'bases_contents' 'mro_is_a_tuple'
		'mro_contents' 'object_bases_of_a_root' 'mro_method_is_a_list')
%

category: 'Grail-Tests'
method: Pep560BasesTestCase
testMultiBaseSubstitution
	"The hook sees the whole header, its answer is spliced in, and the
	original header survives as __orig_bases__."

	self assertAll: #('hook_saw_the_whole_header' 'multi_bases_substituted'
		'multi_orig_bases' 'multi_mro')
%

category: 'Grail-Tests'
method: Pep560BasesTestCase
testAParameterisedGenericHasNoBases
	"The one attribute CPython does not proxy to the origin, and the
	difference is load-bearing: isinstance()/issubclass() decide whether a
	non-type classinfo joins the old-style protocol by asking for a TUPLE
	__bases__, so proxying it makes ``isinstance([], list[int])'' look
	legitimate instead of raising.  Grail got the right answer for the
	wrong reason until __bases__ began answering a real tuple -- which is
	how the tuple change surfaced as a test_isinstance regression, caught
	by the tier-2 gate rather than by the module under repair."

	self assertAll: #('alias_has_no_bases' 'alias_still_proxies_mro'
		'alias_still_proxies_args' 'isinstance_rejects_alias'
		'issubclass_rejects_alias')
%

category: 'Grail-Tests'
method: Pep560BasesTestCase
testSoleBaseSubstitution
	"The sole-base path: a replacing hook, an EMPTY answer (which roots the
	class at object), and __orig_bases__ recorded for both -- while an
	ordinary class still has none at all."

	self assertAll: #('sole_bases_substituted' 'sole_orig_bases' 'sole_mro'
		'empty_bases_falls_back_to_object' 'empty_orig_bases_still_recorded'
		'empty_mro' 'ordinary_class_has_no_orig_bases')
%
