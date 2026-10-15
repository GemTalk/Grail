Class {
	#name : 'DecoratorEvalOrderTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
DecoratorEvalOrderTestCase >> ___chainedRepr___ [
	"CPython's order for a chain of three: all three makers, then the
	decorators bottom-up."

	^ '[42, [''evalname1'', ''evalargs1'', ''makedec1'', ''evalname2'', ''evalargs2'', ''makedec2'', ''evalname3'', ''evalargs3'', ''makedec3'', ''calldec3'', ''calldec2'', ''calldec1'']]'

]

{ #category : 'Grail-Private' }
DecoratorEvalOrderTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
DecoratorEvalOrderTestCase >> reprAt: aKey [
	"The fixture's entries are nested Python lists; compare their repr so a
	failure prints both sides whole."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
DecoratorEvalOrderTestCase >> setUp [
	probe := self ___loadProbe___: 'decorator_eval_order'.

]

{ #category : 'Grail-Tests' }
DecoratorEvalOrderTestCase >> testClassBodyMethodChainIsUnchanged [
	"A method decorated in a class BODY -- printMethodDecoratorChainOn:, a
	third emitter, also already nested and correct."

	self assert: (self reprAt: 'in_class_body')
		equals: '[3, [''evalname1'', ''evalargs1'', ''makedec1'', ''evalname3'', ''evalargs3'', ''makedec3'', ''calldec3'', ''calldec1'']]'.

]

{ #category : 'Grail-Tests' }
DecoratorEvalOrderTestCase >> testModuleLevelChainIsUnchanged [
	"The path that was already correct, through printModuleDecoratorsOn:.  It
	is here as a REGRESSION guard, and as the reason the bug was easy to miss:
	the same source at module level always passed."

	self assert: (self reprAt: 'module_level') equals: self ___chainedRepr___.

]

{ #category : 'Grail-Tests' }
DecoratorEvalOrderTestCase >> testNestedDefEvaluatesAllMakersBeforeApplyingAny [
	"The headline.  A def inside a FUNCTION: previously
	makedec3/calldec3/makedec2/... because each decorator was evaluated and
	applied by its own statement."

	self assert: (self reprAt: 'nested') equals: self ___chainedRepr___.

]

{ #category : 'Grail-Tests' }
DecoratorEvalOrderTestCase >> testNestedInsideAMethodIsTheUpstreamShape [
	"test_decorators' own nesting -- its class and defs live inside the test
	METHOD.  Kept separate from the plain nested case because a method body is
	a different enclosing scope, and it is the spelling the CPython suite
	actually exercises."

	self assert: (self reprAt: 'nested_in_method') equals: self ___chainedRepr___.

]

{ #category : 'Grail-Tests' }
DecoratorEvalOrderTestCase >> testSingleDecoratorPathIsLeftAlone [
	"One decorator: the fused and split orders coincide, so this is the control
	on the guard that keeps the new emit shape off the common case."

	self assert: (self reprAt: 'nested_single')
		equals: '[9, [''evalname2'', ''evalargs2'', ''makedec2'', ''calldec2'']]'.

]

{ #category : 'Grail-Tests' }
DecoratorEvalOrderTestCase >> testTheChainStillThreadsWrappers [
	"The order checks all use decorators that return func UNCHANGED, so they
	would pass even if the applications were reordered into nothing.  These
	return a real wrapper, so the nesting has to thread: outer(inner(f))."

	self assert: (self reprAt: 'decorators_actually_wrap')
		equals: '''outer(inner(f))'''.

]

{ #category : 'Grail-Tests' }
DecoratorEvalOrderTestCase >> testTheSugarMatchesTheHandWrittenNesting [
	"Chapter 7's equivalence claim: ``@A @B def f'' must behave exactly like
	``f = A(B(f))''.  Both spellings are measured through the same tracer, so
	this compares Grail against Grail as well as against CPython."

	self assert: (self reprAt: 'manual') equals: self ___chainedRepr___.

]

{ #category : 'Grail-Tests' }
DecoratorEvalOrderTestCase >> testTwoDecoratorsAreEnoughToShowTheOrder [
	"The shortest chain that distinguishes fused from split.  Worth pinning on
	its own: a fix that only handled three-deep chains, or that special-cased
	the outermost decorator, would pass the three-deep test and fail here."

	self assert: (self reprAt: 'nested_pair')
		equals: '[7, [''evalname1'', ''evalargs1'', ''makedec1'', ''evalname2'', ''evalargs2'', ''makedec2'', ''calldec2'', ''calldec1'']]'.

]
