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
ForAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ForAst
removeallmethods ForAst
removeallclassmethods ForAst

set compile_env: 0

category: 'Grail-code generation'
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

	| isTupleTarget depth iterTemp itemTemp p |
	isTupleTarget := target isKindOf: TupleAst.

	"Walk the AST parent chain to count enclosing ForAst nodes — depth
	is used to disambiguate `___iter___` / `___item___` temp names from
	any outer for-loop, since Smalltalk block temps in nested scopes
	cannot shadow the outer block's temps."
	depth := 0.
	p := parent.
	[p notNil] whileTrue: [
		(p isKindOf: ForAst) ifTrue: [depth := depth + 1].
		p := p parent.
	].
	iterTemp := '___iter' , depth printString , '___'.
	itemTemp := '___item' , depth printString , '___'.

	"Open the StopIteration handler block"
	aStream nextPutAll: '[| '; nextPutAll: iterTemp.
	isTupleTarget ifTrue: [aStream space; nextPutAll: itemTemp].
	aStream nextPutAll: ' |'; lf; increaseIndent.

	"iter := iterable __iter__."
	aStream nextPutAll: iterTemp; nextPutAll: ' := '.
	iter printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __iter__.'; lf.

	"[true] whileTrue: ["
	aStream nextPutAll: '[true] whileTrue: ['; lf; increaseIndent.

	"Per-iteration block: wrap in a PythonContinue handler so `continue`
	cleanly skips to the next iteration."
	aStream nextPutAll: '['; lf; increaseIndent.

	"Assign next item to target"
	isTupleTarget ifTrue: [
		"Tuple unpacking: item := iter __next__."
		aStream nextPutAll: itemTemp; nextPutAll: ' := '; nextPutAll: iterTemp; nextPutAll: ' __next__.'; lf.
		"Unpack each element"
		target elts doWithIndex: [:elt :i |
			aStream nextPutAll: elt id; nextPutAll: ' := '; nextPutAll: itemTemp; nextPutAll: ' __getitem__: '; print: i - 1; nextPut: $.; lf.
		].
	] ifFalse: [
		"Simple: target := iter __next__."
		target printSmalltalkOn: aStream.
		aStream nextPutAll: ' := '; nextPutAll: iterTemp; nextPutAll: ' __next__.'; lf.
	].

	"Body"
	body printSmalltalkOn: aStream.

	"Close per-iteration block + continue handler"
	aStream decreaseIndent; nextPutAll: '] @env0:on: PythonContinue do: [:___ex___ | nil].'; lf.

	"Close whileTrue:"
	aStream decreaseIndent; nextPutAll: '].'; lf.

	"Close outer block with both StopIteration (loop end) and
	PythonBreak (early exit) handlers.  The `,` between exception
	classes must dispatch env-0 — env-1 doesn't have that selector."
	aStream decreaseIndent; nextPutAll: '] @env0:on: (StopIteration @env0:, PythonBreak) do: [:___ex___ | nil].'.

	"Else clause"
	(orelse notNil and: [orelse size > 0]) ifTrue: [
		aStream lf.
		orelse printSmalltalkOn: aStream.
	].
%

category: 'Grail-accessing'
method: ForAst
addVariableNamesTo: aStream
	target addVariableNamesTo: aStream.
%
