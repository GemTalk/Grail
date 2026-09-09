! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassOperatorDispatchTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
MetaclassOperatorDispatchTestCase comment:
'A metaclass''s __iter__ / __contains__ must reach the OPERATOR.

``class Owned(metaclass=Meta)'''' makes Meta''s methods the ones Python uses
for operations on the CLASS itself -- len(Owned), x in Owned,
list(Owned).  Some of those worked in Grail and some did not, and the
split was not arbitrary.  It depended on whether ``object'''' happens to
carry a synthesized DEFAULT for the name:

  * __len__ and __getitem__ have NO default on object, so the env-1 send
    missed, doesNotUnderstand: consulted the recorded metaclass, and they
    worked all along.
  * __iter__ and __contains__: DO have defaults -- the ones raising
    CPython''s ``not iterable'''' / ``not a container'''' TypeErrors -- so the
    send resolved THERE and the metaclass was never asked.

So ``len(Owned)'''' answered 42 while ``''''x'''' in Owned'''' raised
``TypeError: ''''type'''' object is not iterable'''', from the same class, for
the same reason in reverse.  A default that exists to produce a good error
message had quietly become the reason a correct program could not run.

THE DEFAULTS NOW ASK THE RECORDED METACLASS BEFORE RAISING.  Not the
Smalltalk metaclass chain -- ``class Owned(metaclass=Meta)'''' does not put
Meta there at all -- but ___grailMetaclass___, which is where the
association is kept and which already walks the superclass chain, so an
inherited metaclass works too (asserted).

AND THE PROBE REFUSES AN IMPLEMENTATION OWNED BY object OR PythonInstance,
which is not a detail.  A metaclass is itself a Python class and inherits
the very same defaults, so an ungated lookup finds the default again --
and performing it would re-enter this method on the same receiver,
forever.  A metaclass that defines neither is tested for exactly that.

The receiver on the hot path is an INSTANCE, never a class, and
___grailMetaclass___ answers nil after one isKindOf: test for anything
that is not a Behavior -- so the iterate-and-compare containment fallback,
which every ``in'''' against a non-container runs, pays one nil test.  That
fallback is asserted here too, element-first comparison included.'
%

doit
MetaclassOperatorDispatchTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
MetaclassOperatorDispatchTestCase removeAllMethods: 0.
MetaclassOperatorDispatchTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: MetaclassOperatorDispatchTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'metaclass_operator_dispatch' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_operator_dispatch.py')
		name: 'metaclass_operator_dispatch'.
%

category: 'Grail-Helpers'
method: MetaclassOperatorDispatchTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: MetaclassOperatorDispatchTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: MetaclassOperatorDispatchTestCase
testInAndIterationReachTheMetaclass
	"The two the defaults were shadowing.  ``in'' both ways, three
	spellings of iteration, a for loop, and an INHERITED metaclass --
	___grailMetaclass___ walks the superclass chain, as CPython does."

	self assertAll: #('in_uses_the_metaclass' 'iteration_uses_the_metaclass'
		'for_loop_uses_the_metaclass' 'inherited_metaclass_too')
%

category: 'Grail-Tests'
method: MetaclassOperatorDispatchTestCase
testLenAndGetitemAreUnchanged
	"They already worked, by the accident of object having no default for
	them -- so they are the control, not the fix."

	self assertAll: #('len_and_getitem_still_work')
%

category: 'Grail-Tests'
method: MetaclassOperatorDispatchTestCase
testAClassWithNoMetaclassStillRefuses
	"The error messages this default exists to produce."

	self assertAll: #('a_plain_class_is_still_not_iterable'
		'a_plain_class_is_still_not_a_container')
%

category: 'Grail-Tests'
method: MetaclassOperatorDispatchTestCase
testAMetaclassWithoutThemStillRefuses
	"The recursion guard.  A metaclass INHERITS object's defaults, so an
	ungated probe finds the default again and performing it re-enters this
	method on the same receiver forever.  Owned-by-object means not
	supplied."

	self assertAll: #('a_metaclass_without_them_still_raises')
%

category: 'Grail-Tests'
method: MetaclassOperatorDispatchTestCase
testInstancesAreUntouched
	"The hot path: the receiver of an ordinary ``in'' or iteration is an
	instance, and ___grailMetaclass___ answers nil for one after a single
	isKindOf: test."

	self assertAll: #('an_instance_is_unaffected'
		'an_instance_without_iter_still_raises')
%

category: 'Grail-Tests'
method: MetaclassOperatorDispatchTestCase
testTheContainmentFallbackIsIntact
	"__contains__: is not purely an error path -- it IS the
	iterate-and-compare fallback for any object with __iter__ and no
	__contains__, element-first comparison included."

	self assertAll: #('containment_still_falls_back_to_iteration'
		'containment_compares_element_first')
%
