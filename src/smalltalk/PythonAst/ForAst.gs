! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ForAst
expectvalue /Class
doit
StatementAst subclass: 'ForAst'
  instVarNames: #( target iter body
                    orelse type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ForAst comment: 
'For(expr target, expr iter, stmt* body, stmt* orelse) 									// 3.7
For(expr target, expr iter, stmt* body, stmt* orelse, string? type_comment)	// 3.8'
%

expectvalue /Class
doit
ForAst category: 'Parser'
%

! ------------------- Remove existing behavior from ForAst
removeallmethods ForAst
removeallclassmethods ForAst

set compile_env: 0

category: 'code generation'
method: ForAst
printSmalltalkOn: aStream
	"Generate: for target in iter: body
	Translates to:
	  [| ___iter___ |
	   ___iter___ := iter __iter__.
	   [true] whileTrue: [
	     target := ___iter___ __next__.
	     body.
	   ].
	  ] @env0:on: StopIteration do: [:___ex___ | nil].

	For tuple unpacking (for a, b in items), uses a temp ___item___
	and unpacks with __getitem__:."

	| isTupleTarget |
	isTupleTarget := target isKindOf: TupleAst.

	"Open the StopIteration handler block"
	aStream nextPutAll: '[| ___iter___'.
	isTupleTarget ifTrue: [aStream nextPutAll: ' ___item___'].
	aStream nextPutAll: ' |'; lf; increaseIndent.

	"___iter___ := iterable __iter__."
	aStream nextPutAll: '___iter___ := '.
	iter printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __iter__.'; lf.

	"[true] whileTrue: ["
	aStream nextPutAll: '[true] whileTrue: ['; lf; increaseIndent.

	"Assign next item to target"
	isTupleTarget ifTrue: [
		"Tuple unpacking: ___item___ := ___iter___ __next__."
		aStream nextPutAll: '___item___ := ___iter___ __next__.'; lf.
		"Unpack each element"
		target elts doWithIndex: [:elt :i |
			aStream nextPutAll: elt id; nextPutAll: ' := ___item___ __getitem__: '; print: i - 1; nextPut: $.; lf.
		].
	] ifFalse: [
		"Simple: target := ___iter___ __next__."
		target printSmalltalkOn: aStream.
		aStream nextPutAll: ' := ___iter___ __next__.'; lf.
	].

	"Body"
	body printSmalltalkOn: aStream.

	"Close whileTrue:"
	aStream decreaseIndent; nextPutAll: '].'; lf.

	"Close handler block"
	aStream decreaseIndent; nextPutAll: '] @env0:on: StopIteration do: [:___ex___ | nil].'.

	"Else clause"
	(orelse notNil and: [orelse size > 0]) ifTrue: [
		aStream lf.
		orelse printSmalltalkOn: aStream.
	].
%

category: 'accessing'
method: ForAst
addVariableNamesTo: aStream
	target addVariableNamesTo: aStream.
%
