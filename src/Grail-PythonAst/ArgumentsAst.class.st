"arguments = (arg* posonlyargs, arg* args, arg? vararg, arg* kwonlyargs,
                 expr* kw_defaults, arg? kwarg, expr* defaults)"
Class {
	#name : 'ArgumentsAst',
	#superclass : 'AbstractNode',
	#instVars : [
		'posonlyargs',
		'args',
		'vararg',
		'kwonlyargs',
		'kw_defaults',
		'kwarg',
		'defaults'
	],
	#category : 'Grail-Parser'
}

{ #category : 'Grail-Accessing' }
ArgumentsAst >> ___bindsParameterNamed___: aSymbol [
	"Is aSymbol one of these parameters -- positional-only, ordinary,
	``*args'', keyword-only or ``**kwargs''?"

	| all |
	all := OrderedCollection new.
	posonlyargs isNil ifFalse: [all addAll: posonlyargs].
	args isNil ifFalse: [all addAll: args].
	vararg isNil ifFalse: [all add: vararg].
	kwonlyargs isNil ifFalse: [all addAll: kwonlyargs].
	kwarg isNil ifFalse: [all add: kwarg].
	^ (all detect: [:a | a name asSymbol == aSymbol] ifNone: [nil]) notNil

]

{ #category : 'Grail-other' }
ArgumentsAst >> appendDefault: aNode [
	"Append a synthetic trailing default expression.  Used by the
	bigmemtest decorator shim (FunctionDefAst>>applyBigmemtestDefaultIfNeeded)
	to give a required trailing parameter a dry-run default, so a stock
	CPython ``@bigmemtest''-decorated test method — whose decorator Grail
	drops — is still callable with no arguments.  Copies into an
	OrderedCollection first: the parser stores ``defaults'' as a fixed
	Array (``Array new'' when the def has no defaults), which cannot grow."
	defaults := defaults isNil
		ifTrue: [OrderedCollection new]
		ifFalse: [OrderedCollection withAll: defaults].
	defaults add: aNode.

]

{ #category : 'Grail-other' }
ArgumentsAst >> args [

	^args

]

{ #category : 'Grail-other' }
ArgumentsAst >> args: newValue [
	args := newValue

]

{ #category : 'Grail-other' }
ArgumentsAst >> defaults [

	^defaults

]

{ #category : 'Grail-other' }
ArgumentsAst >> defaults: newValue [
	defaults := newValue

]

{ #category : 'Grail-other' }
ArgumentsAst >> kw_defaults [

	^kw_defaults

]

{ #category : 'Grail-other' }
ArgumentsAst >> kw_defaults: newValue [
	kw_defaults := newValue

]

{ #category : 'Grail-other' }
ArgumentsAst >> kwarg [

	^kwarg

]

{ #category : 'Grail-other' }
ArgumentsAst >> kwarg: newValue [
	kwarg := newValue

]

{ #category : 'Grail-other' }
ArgumentsAst >> kwonlyargs [

	^kwonlyargs

]

{ #category : 'Grail-other' }
ArgumentsAst >> kwonlyargs: newValue [
	kwonlyargs := newValue

]

{ #category : 'Grail-other' }
ArgumentsAst >> posonlyargs [

	^posonlyargs

]

{ #category : 'Grail-other' }
ArgumentsAst >> posonlyargs: newValue [
	posonlyargs := newValue

]

{ #category : 'Grail-other' }
ArgumentsAst >> vararg [

	^vararg

]

{ #category : 'Grail-other' }
ArgumentsAst >> vararg: newValue [
	vararg := newValue

]
