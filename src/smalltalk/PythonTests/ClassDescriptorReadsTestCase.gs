! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ClassDescriptorReadsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ClassDescriptorReadsTestCase comment:
'A descriptor ASSIGNED to a class at runtime binds on a class read.

``Cls.m = classmethod(f)'' then ``Cls.m(5)'' answered ``''classmethod''
object is not callable''.  The class-attribute read consulted the
descriptor protocol for only ONE of the two homes a runtime store can
land in: a value in the per-class ___dynInstVars___ holder was asked for
__get__ (___classChainAttrLookup___ does it), while the identical store
landing in the canonical-class OVERLAY was returned raw -- and a bare
classmethod wrapper is not callable, in Grail or in CPython.  The
INSTANCE read was always right, which is what kept this to the
class-side spelling.

The subscript path had the matching bug one layer up.  A runtime
``Cls.__class_getitem__ = classmethod(f)'' was called as ``f(cls, cls,
item)'': the read had already bound the class and Metaclass3 >>
__getitem__: supplied it again.  CPython reads __class_getitem__ off the
class THROUGH the descriptor protocol -- classmethod arrives bound,
staticmethod unwrapped -- and calls it with the INDEX ALONE; all four
shapes a runtime assignment can take were measured on 3.14 and are
pinned by the fixture.  Branch (1) of that method keeps its own
two-argument call, because it unwraps the wrapper BY HAND and nothing
has bound the class at that point.

Took test.test_genericclass 7 -> 6 (test_class_getitem_patched).

See tests/python/class_descriptor_reads.py (13 checks, CPython-validated
first).'
%

expectvalue /Class
doit
ClassDescriptorReadsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ClassDescriptorReadsTestCase removeAllMethods: 0.
ClassDescriptorReadsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassDescriptorReadsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_descriptor_reads' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_descriptor_reads.py')
		name: 'class_descriptor_reads'.
%

category: 'Grail-Helpers'
method: ClassDescriptorReadsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ClassDescriptorReadsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: ClassDescriptorReadsTestCase
testAssignedDescriptorsBindOnAClassRead
	"classmethod and staticmethod, called through the class AND through an
	instance -- the instance side was already right and must stay so."

	self assertAll: #('classmethod_call_via_class'
		'classmethod_call_via_instance' 'staticmethod_call_via_class'
		'staticmethod_call_via_instance')
%

category: 'Grail-Tests'
method: ClassDescriptorReadsTestCase
testTheNonDescriptorCasesAreUnchanged
	"A plain function assigned at runtime still binds only through an
	instance, and a property still reads as its value through one and as
	the descriptor off the class."

	self assertAll: #('plain_function_via_instance' 'plain_function_via_class'
		'property_reads_through_instance'
		'property_off_the_class_is_the_descriptor')
%

category: 'Grail-Tests'
method: ClassDescriptorReadsTestCase
testRuntimeClassGetitemTakesTheIndexAlone
	"The four shapes a runtime __class_getitem__ assignment can take, and
	the corpus case: installed from __init_subclass__, so the store lands
	on the SUBCLASS and the hook sees that subclass."

	self assertAll: #('subscript_classmethod' 'subscript_staticmethod'
		'subscript_one_arg_function' 'subscript_installed_by_init_subclass'
		'subscript_installed_sees_its_own_class')
%
