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
	"Generate: for target in iter: body [else: else_body]

	Translates to:
	  [
	   [| ___iter___ |
	    ___iter___ := iter __iter__.
	    [true] whileTrue: [
	      [target := ___iter___ __next__. body]
	          @env0:on: PythonContinue do: [...].
	    ].
	   ] @env0:on: StopIteration do: [:___ex___ | nil].
	   else_body.   ""only runs when the loop drained naturally""
	  ] @env0:on: PythonBreak do: [:___ex___ | nil].

	Python ``for-else`` requires the else clause to execute ONLY
	when the loop drains naturally — ``break`` must skip it.  Catch
	StopIteration (natural end) on the INNER handler, let
	PythonBreak propagate through it to an OUTER handler that wraps
	BOTH the loop and the else clause; the outer handler catches
	the break and the else clause never runs.

	For tuple unpacking (for a, b in items), uses a temp ___item___
	and unpacks with __getitem__:."

	| isTupleTarget depth iterTemp itemTemp p hasElse |
	isTupleTarget := target isKindOf: TupleAst.
	hasElse := orelse notNil and: [orelse size > 0].

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

	"Outer PythonBreak handler — wraps the iteration AND the else
	clause so a ``break`` from the body skips both."
	aStream nextPutAll: '['; lf; increaseIndent.

	"Inner StopIteration handler block"
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

	"Close inner block with StopIteration handler only — PythonBreak
	propagates past this handler so the else clause is skipped."
	aStream decreaseIndent; nextPutAll: '] @env0:on: StopIteration do: [:___ex___ | nil].'; lf.

	"Else clause — runs only after a natural loop drain."
	hasElse ifTrue: [
		orelse printSmalltalkOn: aStream.
		aStream lf.
	].

	"Close outer block with PythonBreak handler."
	aStream decreaseIndent; nextPutAll: '] @env0:on: PythonBreak do: [:___ex___ | nil].'.
%

category: 'Grail-accessing'
method: ForAst
addVariableNamesTo: aStream
	target addVariableNamesTo: aStream.
%
