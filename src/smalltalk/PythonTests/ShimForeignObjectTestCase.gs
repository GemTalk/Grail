! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ShimForeignObjectTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ShimForeignObjectTestCase'
  instVarNames: #( )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ShimForeignObjectTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ShimForeignObjectTestCase
!
! ShimForeignObject is the reverse proxy that lets a prebuilt CPython wheel's
! own C object (e.g. a numpy DType) cross into Grail.  These tests exercise the
! proxy directly — no .so needed: __name__ (the unqualified tail of the C
! tp_name), __module__, the cPtr round-trip view that CPythonShim>>wrap: uses to
! hand the original pointer back to C, and pointer->proxy deduplication.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ShimForeignObjectTestCase removeAllMethods.
ShimForeignObjectTestCase class removeAllMethods.
%

category: 'Grail-Tests'
method: ShimForeignObjectTestCase
testDottedNameStripsModule
	"__name__ is the unqualified tail of a dotted C tp_name (CPython's
	type.__name__ drops the module prefix)."

	| p |
	p := ShimForeignObject new.
	p setCPtr: 16r1000 typeName: 'numpy.dtypes.Float64DType'.
	self assert: (p @env1:___pyAttrLoad___: #'__name__') equals: 'Float64DType'.
	self assert: (p @env1:___pyAttrLoad___: #'__qualname__') equals: 'Float64DType'.
	self assert: (p @env1:___pyAttrLoad___: #'__module__') equals: 'numpy.dtypes'
%

category: 'Grail-Tests'
method: ShimForeignObjectTestCase
testUndottedName
	"A tp_name with no '.' is its own __name__, with an empty __module__."

	| p |
	p := ShimForeignObject new.
	p setCPtr: 16r2000 typeName: 'object'.
	self assert: (p @env1:___pyAttrLoad___: #'__name__') equals: 'object'.
	self assert: (p @env1:___pyAttrLoad___: #'__module__') equals: ''
%

category: 'Grail-Tests'
method: ShimForeignObjectTestCase
testRoundTripView
	"pyObjectView yields a CByteArray whose memoryAddress IS the foreign
	pointer, so wrap: hands the original C object straight back."

	| buf addr p |
	buf := CByteArray gcMalloc: 32.       "a real, readable address to stand in for a PyObject*"
	addr := buf memoryAddress.
	p := ShimForeignObject new.
	p setCPtr: addr typeName: 'foo.Bar'.
	self assert: p pyObjectView memoryAddress equals: addr.
	"cached: same view object on a second send"
	self assert: p pyObjectView == p pyObjectView
%

category: 'Grail-Tests'
method: ShimForeignObjectTestCase
testProxyDedup
	"The server's pointer->proxy map returns the same proxy for the same
	foreign pointer, and distinct proxies for distinct pointers."

	| shim a b c |
	shim := CPythonShim current.
	a := shim foreignProxyForPointer: 16r4242 typeName: 'pkg.A'.
	b := shim foreignProxyForPointer: 16r4242 typeName: 'pkg.A'.
	c := shim foreignProxyForPointer: 16r9999 typeName: 'pkg.C'.
	self assert: a == b.
	self deny: a == c.
	self assert: (a @env1:___pyAttrLoad___: #'__name__') equals: 'A'
%

category: 'Grail-Tests'
method: ShimForeignObjectTestCase
testUnknownAttributeRaises
	"An attribute the proxy does not forward raises AttributeError."

	| p raised |
	p := ShimForeignObject new.
	p setCPtr: 16r3000 typeName: 'foo.Bar'.
	raised := false.
	[ p @env1:___pyAttrLoad___: #'no_such_attr' ]
		on: AbstractException
		do: [:ex | raised := true].
	self assert: raised
%
