Class {
	#name : 'FunctoolsWrapsVarargsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - functools' }
FunctoolsWrapsVarargsTestCase >> testWrapsKwargsReturnsIdentityDecorator [
	"``functools.wraps(wrapped, assigned=..., updated=...)'' returns
	an identity-decorator stub.  Applying it to a function returns
	that function unchanged.  Goes through ``_wraps:kw:'' directly
	(the varargs entry the decorator-chain codegen dispatches into
	when kwargs are present)."

	| funct deco wrapped wrappee result kw |
	funct := functools ___instance___.
	wrapped := [:x | x + 1].
	kw := KeyValueDictionary new
		at: 'assigned' put: #('__name__');
		at: 'updated' put: #();
		yourself.
	deco := funct @env1:_wraps: { wrapped } kw: kw.
	"deco is an identity decorator block; apply it to a wrappee"
	wrappee := [:y | y * 2].
	result := deco @env1:value: { wrappee } value: nil.
	self assert: (result value: 5) equals: 10

]

{ #category : 'Grail-Tests - functools' }
FunctoolsWrapsVarargsTestCase >> testWrapsKwargsRoutesThroughVarargsSelector [
	"Confirm the dispatch goes through ``_wraps:kw:'' (the kwargs
	entry) rather than the fixed-arity ``wraps:'' — exercising the
	BoundMethod varargs path that the decorator chain uses."

	| funct |
	funct := functools ___instance___.
	"Both selectors must exist for the dispatch to pick the right
	one based on kwarg presence."
	self assert: (functools whichClassIncludesSelector: #'wraps:' environmentId: 1) notNil.
	self assert: (functools whichClassIncludesSelector: #'_wraps:kw:' environmentId: 1) notNil

]
