Class {
	#name : 'ShimForeignObjectTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ShimForeignObjectTestCase >> testDottedNameStripsModule [
	"__name__ is the unqualified tail of a dotted C tp_name (CPython's
	type.__name__ drops the module prefix)."

	| p |
	p := ShimForeignObject new.
	p setCPtr: 16r1000 typeName: 'numpy.dtypes.Float64DType'.
	self assert: (p @env1:___pyAttrLoad___: #'__name__') equals: 'Float64DType'.
	self assert: (p @env1:___pyAttrLoad___: #'__qualname__') equals: 'Float64DType'.
	self assert: (p @env1:___pyAttrLoad___: #'__module__') equals: 'numpy.dtypes'

]

{ #category : 'Grail-Tests' }
ShimForeignObjectTestCase >> testProxyDedup [
	"The server's pointer->proxy map returns the same proxy for the same
	foreign pointer, and distinct proxies for distinct pointers.  A new proxy
	takes one reference to its C object (___retainForeignPointer:), so the
	pointers are readable blocks standing in for PyObject*s, and finding the
	proxy again takes no second one.  Their entries are removed after: the
	blocks are freed with their CByteArrays, and a real C object at the same
	address must not find a test's proxy."

	| shim bufA bufC a b c |
	shim := CPythonShim current.
	bufA := CByteArray gcMalloc: 32.
	bufC := CByteArray gcMalloc: 32.
	bufA int64At: 0 put: 1.
	bufC int64At: 0 put: 1.
	[a := shim foreignProxyForPointer: bufA memoryAddress typeName: 'pkg.A'.
	b := shim foreignProxyForPointer: bufA memoryAddress typeName: 'pkg.A'.
	c := shim foreignProxyForPointer: bufC memoryAddress typeName: 'pkg.C'.
	self assert: a == b.
	self deny: a == c.
	self assert: (bufA int64At: 0) equals: 2.
	self assert: (a @env1:___pyAttrLoad___: #'__name__') equals: 'A']
		ensure: [
			(SessionTemps current at: #'GrailForeignProxies' otherwise: nil) ifNotNil: [:map |
				map removeKey: bufA memoryAddress ifAbsent: [nil].
				map removeKey: bufC memoryAddress ifAbsent: [nil]]]

]

{ #category : 'Grail-Tests' }
ShimForeignObjectTestCase >> testRoundTripView [
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

]

{ #category : 'Grail-Tests' }
ShimForeignObjectTestCase >> testUndottedName [
	"A tp_name with no '.' is its own __name__, with an empty __module__."

	| p |
	p := ShimForeignObject new.
	p setCPtr: 16r2000 typeName: 'object'.
	self assert: (p @env1:___pyAttrLoad___: #'__name__') equals: 'object'.
	self assert: (p @env1:___pyAttrLoad___: #'__module__') equals: ''

]

{ #category : 'Grail-Tests' }
ShimForeignObjectTestCase >> testUnknownAttributeRaises [
	"An attribute the proxy does not forward raises AttributeError."

	| p raised |
	p := ShimForeignObject new.
	p setCPtr: 16r3000 typeName: 'foo.Bar'.
	raised := false.
	[ p @env1:___pyAttrLoad___: #'no_such_attr' ]
		on: AbstractException
		do: [:ex | raised := true].
	self assert: raised

]
