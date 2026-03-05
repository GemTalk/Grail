! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ConstantAst
expectvalue /Class
doit
ExpressionAst subclass: 'ConstantAst'
  instVarNames: #( value kind)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ConstantAst comment: 
'Constant(constant value, string? kind)

A constant value. The value attribute of the Constant literal contains the Python object it represents.
The values represented can be simple types such as a number, string or None, but also immutable
container types (tuples and frozensets) if all of their elements are constant."'
%

expectvalue /Class
doit
ConstantAst category: 'Parser'
%

! ------------------- Remove existing behavior from ConstantAst
removeallmethods ConstantAst
removeallclassmethods ConstantAst

set compile_env: 0

category: 'other'
method: ConstantAst
printSmalltalkOn: aStream

	value == true ifTrue: [
		aStream nextPutAll: 'true'.
		^self.
	].
	value == false ifTrue: [
		aStream nextPutAll: 'false'.
		^self.
	].
	value == nil ifTrue: [
		aStream nextPutAll: 'nil'.
		^self.
	].
	(value isKindOf: String) ifTrue: [
		aStream nextPutAll: value printString.
		^self.
	].
	(value isKindOf: ByteArray) ifTrue: [
		aStream nextPutAll: '#['.
		value doWithIndex: [:each :i |
			i > 1 ifTrue: [aStream nextPutAll: ' '].
			aStream print: each.
		].
		aStream nextPutAll: ']'.
		^self.
	].
	(value isKindOf: complex) ifTrue: [
		aStream
			nextPutAll: '(complex ___new___: ';
			print: (value perform: #real env: 1);
			nextPutAll: ' _: ';
			print: (value perform: #imag env: 1);
			nextPutAll: ')'.
		^self.
	].
	aStream print: value.
%

category: 'other'
method: ConstantAst
set: container to: anObject scope: aScope

	container
		set: value
		to: anObject.
%

category: 'other'
method: ConstantAst
value

	^value
%
