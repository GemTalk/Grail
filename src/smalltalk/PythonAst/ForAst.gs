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
		"Unpack each element, recursing into nested tuples like
		``for target, (action, param) in items``."
		self
			emitUnpackOn: aStream
			target: target
			source: itemTemp
			depth: depth.
	] ifFalse: [
		"Simple: target := iter __next__.  Phase A: when the target is
		a module-scope name (declared in body variables, not shadowed
		by an enclosing function), route the per-iteration binding
		through the module instance's dynamic-instVar storage."
		self
			emitForTargetStore: target
			source: iterTemp , ' __next__'
			on: aStream.
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

category: 'Grail-code generation'
method: ForAst
emitForTargetStore: aNameAst source: sourceExpr on: aStream
	"Phase A: emit ``target := sourceExpr.'' OR
	``self @env0:dynamicInstVarAt: #'target' put: sourceExpr.''
	depending on whether the for-loop target is a module-scope name.
	sourceExpr is a raw Smalltalk fragment (already evaluated to the
	next iteration value), not parenthesized — wrap it here when the
	store needs the value as a keyword-message arg."

	(self isModuleScopeForTarget: aNameAst) ifTrue: [
		aStream
			nextPutAll: self ___moduleStoreReceiverExpr___;
			nextPutAll: ' @env0:dynamicInstVarAt: #''';
			nextPutAll: aNameAst id;
			nextPutAll: ''' put: (';
			nextPutAll: sourceExpr;
			nextPutAll: ').'; lf.
		^ self
	].
	aStream
		nextPutAll: aNameAst id;
		nextPutAll: ' := ';
		nextPutAll: sourceExpr;
		nextPut: $.; lf.
%

category: 'Grail-code generation'
method: ForAst
isModuleScopeForTarget: aNameAst
	"True if this for-loop target is a module-scope name: we're
	compiling inside a module body (no enclosing user class method),
	the name is declared in the module body's scope, and no
	enclosing function shadows it."

	CallAst moduleClassBeingCompiled ifNil: [^ false].
	"``global x'' in the nearest enclosing function forces the module
	route -- even inside a class method (the emitters pick the module-
	instance receiver via ___moduleStoreReceiverExpr___) and past any
	enclosing-function shadow (Python: the declaration binds the name
	to the module for the whole declaring scope)."
	(aNameAst ___nearestEnclosingFunctionDeclaresGlobal___: aNameAst id)
		ifTrue: [^ true].
	CallAst classBeingCompiled ifNotNil: [^ false].
	(aNameAst isModuleVariableName: aNameAst id) ifFalse: [^ false].
	"PRECISE local-shadow check (writes + params; comprehension targets
	and global-declared names excluded) -- not the over-approximating
	___declaredInEnclosingFunction___: variables walk."
	(aNameAst ___pythonLocalInEnclosingFunctions___: aNameAst id) ifTrue: [^ false].
	^ true
%

category: 'Grail-code generation'
method: ForAst
emitUnpackOn: aStream target: aTarget source: sourceExpr depth: aDepth
	"Recursively unpack ``aTarget`` (a NameAst or a nested
	TupleAst / ListAst) by reading from the parenthesized
	Smalltalk expression ``sourceExpr``.  For a plain NameAst emit
	a single assignment; for a tuple-shaped target generate
	per-element ``__getitem__:`` reads, and recurse for nested
	tuples by reusing the wrapped subscript expression as the
	source.  Re-evaluates the subscript per name on each level —
	acceptable because the source is typically a fast indexable
	(tuple / list) and the alternative would require declaring
	fresh outer-block temps after the temp pane has been emitted."

	(aTarget isKindOf: NameAst) ifTrue: [
		self emitForTargetStore: aTarget source: sourceExpr on: aStream.
		^ self
	].
	((aTarget isKindOf: TupleAst) or: [aTarget isKindOf: ListAst]) ifTrue: [
		| n |
		n := aTarget elts size.
		aTarget elts doWithIndex: [:elt :i |
			| childExpr starIdx |
			(elt isKindOf: StarredAst) ifTrue: [
				"PEP 3132 star target — ``for head, *tail in ...''.
				The starred name takes the middle slice: everything
				from its position up to len - (elements after it).
				Emitted as a Python-level slice through __getitem__:
				with a slice object, so any sequence works."
				starIdx := i - 1.
				childExpr := '(list @env1:__new__: (' , sourceExpr ,
					' __getitem__: (slice @env1:__new__: ' , starIdx printString ,
					' _: ((' , sourceExpr , ' __len__) @env0:- ' ,
					(n - i) printString , '))))'.
				self
					emitUnpackOn: aStream
					target: elt value
					source: childExpr
					depth: aDepth
			] ifFalse: [
				| after |
				"Elements AFTER a star index from the sequence end."
				after := (aTarget elts copyFrom: 1 to: i - 1)
					anySatisfy: [:e | e isKindOf: StarredAst].
				childExpr := after
					ifTrue: ['(' , sourceExpr , ' __getitem__: ((' ,
						sourceExpr , ' __len__) @env0:- ' ,
						(n - i + 1) printString , '))']
					ifFalse: ['(' , sourceExpr , ' __getitem__: ' ,
						(i - 1) printString , ')'].
				self
					emitUnpackOn: aStream
					target: elt
					source: childExpr
					depth: aDepth
			]
		].
		^ self
	].
	"Fallback: emit a single assignment via the target's own
	printSmalltalkOn:.  Covers attribute / subscript targets that
	the parser rarely produces in for-loops but might appear."
	aTarget printSmalltalkOn: aStream.
	aStream nextPutAll: ' := '; nextPutAll: sourceExpr; nextPut: $.; lf
%
