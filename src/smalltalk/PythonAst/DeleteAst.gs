! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for DeleteAst
expectvalue /Class
doit
StatementAst subclass: 'DeleteAst'
  instVarNames: #( targets)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
DeleteAst comment:
'https://docs.python.org/3/library/ast.html#ast.Del

Expression context for deletion (del statement).

Used as the ctx field in Name, Attribute, and Subscript nodes when they appear in a del statement.

Example:
>>> print(ast.dump(ast.parse(''del x''), indent=4))
Module(
    body=[
        Delete(
            targets=[Name(id=''x'', ctx=Del())])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        DeleteAst
'
%

expectvalue /Class
doit
DeleteAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from DeleteAst
removeallmethods DeleteAst
removeallclassmethods DeleteAst
set compile_env: 0

category: 'Grail-Accessing'
method: DeleteAst
targets
	^ targets
%

category: 'Grail-other'
method: DeleteAst
printSmalltalkOn: aStream
	"Generate Smalltalk for `del target1, target2, ...`.

	For each target:
	  * SubscriptAst (del x[key]) → (x) __delitem__: (key)
	  * NameAst (del name) → name := nil
	  * AttributeAst (del obj.attr) → not yet supported, raises error

	See https://docs.python.org/3/reference/simple_stmts.html#the-del-statement"

	targets do: [:target |
		(target isKindOf: SubscriptAst) ifTrue: [
			"del x[key] → (x) __delitem__: (key)"
			aStream nextPut: $(.
			target value printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: ') __delitem__: ('.
			target slice printSmalltalkOn: aStream.
			aStream nextPutAll: ').'.
		] ifFalse: [
			(target isKindOf: AttributeAst) ifTrue: [
				"del obj.attr → obj @env1:__delattr__: 'attr'.
				Routes through the ``__delattr__'' protocol so user
				overrides intercept; default ``object>>__delattr__:''
				falls through to ``___pyAttrDelete___:'' which raises
				AttributeError on miss and removes the slot otherwise.
				Name passed as a Smalltalk String (Python ``str''), not
				a Symbol — user override checks like ``name == 'x'''
				are str-vs-str in Python."
				target value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ' @env1:__delattr__: ''';
					nextPutAll: target ___mangledAttr___;
					nextPutAll: '''.'.
			] ifFalse: [
				(target isKindOf: NameAst) ifTrue: [
					"``nonlocal __class__; del __class__'' inside a METHOD.
					CPython's ``__class__'' is a cell every method of the class
					SHARES, so this empties that cell rather than unbinding
					anything local: afterwards every method's ``__class__'' read
					raises NameError and every zero-argument ``super()'' in the
					class reports ``empty __class__ cell'' -- in methods that did
					no deleting, and on every later call.

					Grail compiled it as a local delete, declaring a fresh
					``__class__'' temp and nilling it, which no read ever
					consulted: the statement was a no-op and a following
					``super()'' handed back a working proxy (test_super's
					test_obscure_super_errors).

					The ``nonlocal'' declaration is required and is not a
					formality -- without it CPython makes the name local to the
					def, so the delete raises UnboundLocalError and the cell is
					untouched.  Guarded on the class context as well, since a
					``__class__'' outside a class has no cell to empty and keeps
					the ordinary local branch below."
					(target id asSymbol == #'__class__'
						and: [CallAst classBodyRuntimeClass == nil
						and: [CallAst classBeingCompiled notNil
						and: [CallAst inClassBodyValueEmit ~~ true
						and: [CallAst ___functionDeclaresNonlocal___: #'__class__']]]])
						ifTrue: [
							CallAst ___printClassObjectOn___: aStream.
							aStream nextPutAll: ' @env1:___grailClearClassCell___.'
						] ifFalse: [
					"``nonlocal x; del x'' inside a method of a METHOD-LOCAL class:
					x is an ENCLOSING FUNCTION'S local reached past the class, so it
					has no temp here to nil -- the local branch below emitted
					``x := nil'' against an undeclared identifier, the whole method
					failed to compile, and ___compileMethodCatchingErrors___ turned
					it into a stub raising ``codegen gap'' when CALLED.  Measured on
					``def f(): class C: def clear(self): nonlocal x; del x'' followed
					by a read of x: NameError on both arms where CPython raises
					UnboundLocalError.

					The write half already knows the answer: a store to such a name
					goes through the setter block the enclosing frame handed the
					class (AssignAst's ___classCellSetter___ branch).  A DELETE is
					that store with nil -- and nil is what an unbound local holds, so
					the enclosing scope's own read guard (``ifNil: [UnboundLocalError
					___signalUnbound___: #x]'') raises the right error afterwards
					without a second mechanism.  Checked BEFORE the class-body and
					module branches, exactly as the assignment checks it."
					((CallAst classBeingCompiled notNil)
						and: [CallAst classBodyRuntimeClass == nil
						and: [CallAst inClassBodyValueEmit ~~ true
						and: [target ___enclosingFunctionLocalBeyondClass___: target id]]])
						ifTrue: [
							CallAst addCapturedWriteName: target id.
							aStream
								nextPutAll: '(self @env1:___classCellSetter___: #''___cellSetter_';
								nextPutAll: target id;
								nextPutAll: '___'') value: nil.'
						] ifFalse: [
					"``del x'' in a CLASS BODY.  CPython's is DELETE_NAME on the
					body's own namespace: it unbinds the class attribute, raises
					NameError when nothing there is bound, and never reaches the
					enclosing function local or module global of the same name.

					Grail compiles a class body structurally, and a DeleteAst
					yields no attribute pair, so the whole statement used to be
					DROPPED -- ``class C: x = 1; del x'' left C.x == 1 and
					reported nothing.  Nor could the branches below stand in: the
					module one binds the wrong scope, and the function-local one
					(``x := nil'') would nil an ENCLOSING def's temp, which is
					precisely the binding CPython leaves alone
					(testClassNamespaceOverridesClosure asserts the outer x is
					still 42 after the class body deletes its own).

					classBodyRuntimeClass is set by ClassDefAst only around
					class-body-level statements, which is exactly the scope this
					applies to; a ``del'' inside a method compiles under no such
					flag and keeps the local branch."
					CallAst classBodyRuntimeClass ifNil: [
					(self isModuleScopeTarget: target) ifTrue: [
						"Phase A: `del name` at module scope truly removes
						the binding from the module instance's dynamic-
						instVar storage.  A subsequent read probes
						``self dynamicInstVarAt: ifAbsent: [NameError]''
						and raises Python's NameError on miss — matching
						CPython's module-scope semantics for ``del x''."
						aStream nextPutAll: self ___moduleStoreReceiverExpr___;
							nextPutAll: ' @env0:removeDynamicInstVar: #''';
							nextPutAll: target id;
							nextPutAll: '''.'.
					] ifFalse: [
						"Function-local `del name` → nil the Smalltalk
						temp.  NameAst wraps subsequent reads in an
						``ifNil: [UnboundLocalError
						___signalUnbound___: #name]'' guard, so a
						post-del read raises UnboundLocalError naming
						the variable."
						aStream nextPutAll: target id; nextPutAll: ' := nil.'
					]] ifNotNil: [:clsName |
						aStream nextPutAll: clsName;
							nextPutAll: ' @env1:___classBodyDefinitionalDelete___: #''';
							nextPutAll: target ___mangledId___;
							nextPutAll: '''.']]]
				] ifFalse: [
					self error: 'del for ', target class name, ' is not yet supported'
				]
			]
		].
		aStream lf.
	].
%

category: 'Grail-other'
method: DeleteAst
isModuleScopeTarget: aNameAst
	"Phase A: true if this `del` target is a module-scope name —
	we're compiling inside a module body or top-level def (not a
	user class method), the name was declared in the module body's
	scope, and no enclosing function shadows it as a local."

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
method: DeleteAst
targets: newValue
	targets := newValue
%

category: 'Grail-IR Codegen'
method: DeleteAst
___irEligibleStatementLocals___: localNames
	"``del x[k]'' and ``del o.a'' with emittable pieces, and ``del name'' for a
	body local or parameter: the text's function-local branch, ``name := nil''.
	The read a later ``name'' would need the unbound guard for is what the flow
	analysis refuses (___irFlowBound___:locals: drops the name), so such a def
	stays on text and its guard.  In a module def none of the text's other
	name branches (module-scope, class-body, the ``__class__'' cell) apply."

	targets isEmpty ifTrue: [^ false].
	^ targets allSatisfy: [:t |
		((t isKindOf: SubscriptAst)
			and: [(t value ___irEligibleValueLocals___: localNames)
			and: [t slice ___irEligibleValueLocals___: localNames]])
		or: [((t isKindOf: AttributeAst)
			and: [t value ___irEligibleValueLocals___: localNames])
		or: [(t isKindOf: NameAst)
			and: [self ___irNameTargetEligible___: t locals: localNames]]]]
%

category: 'Grail-IR Codegen'
method: DeleteAst
___irNameTargetEligible___: aNameAst locals: localNames
	"Which of printSmalltalkOn:'s FOUR ``del name'' branches this target takes,
	and whether the IR path can spell it.

	Two it can.  A body local or parameter is the temp nilled below.  A MODULE
	name -- which is what ``global x; del x'' makes it, and what test_global is
	built out of -- is ``removeDynamicInstVar:'' on the module instance, the
	exact undo of the store ___emitIRModuleScopeStoreOf___:from:on: emits, now
	through a shared receiver helper so the two cannot name different objects.

	Two it cannot, each keeping its own census row rather than hiding in this
	one:

	  * a CLASS BODY target, which is
	    ``___classBodyDefinitionalDelete___:'' on the class being built
	    (``DeleteAst:classBody'');
	  * ``nonlocal __class__; del __class__'' inside a method, which EMPTIES the
	    class cell every method of the class shares rather than unbinding
	    anything (``DeleteAst:classCell'').  Getting that one wrong is not a
	    compile failure but a silent no-op -- which is what Grail did before the
	    text branch existed, leaving a later super() with a working proxy."

	"The class-cell delete is EMITTABLE now (___grailClearClassCell___ against
	the class object, the twin of the text branch), so it no longer refuses."
	self ___irIsClassCellDelete___: aNameAst ifTrue: [^ true].
	"...and so is the ORDINARY closure-cell delete beside it: ``nonlocal x;
	del x'' in a method of a method-local class, which stores nil through
	the same setter block AssignAst's store branch uses.  It was refused
	here (cm:DeleteAst:name, test_dict's ClearOnDelete.__del__) and the
	TEXT could not spell it either -- see printSmalltalkOn:."
	(self ___irIsClosureCellDelete___: aNameAst) ifTrue: [^ true].
	CallAst classBodyRuntimeClass notNil ifTrue: [^ false].
	(self isModuleScopeTarget: aNameAst) ifTrue: [^ true].
	^ localNames includes: aNameAst id asString
%

category: 'Grail-IR Codegen'
method: DeleteAst
___irIsClosureCellDelete___: aNameAst
	"Is this ``del name'' a write to an ENCLOSING FUNCTION'S local reached
	past a class -- the shape AssignAst stores through
	___classCellSetter___?  One predicate, read by the eligibility test and
	by the emit, so the two cannot disagree about which branch a target
	takes.  ``__class__'' is NOT this: it is the class's own implicit cell
	and is claimed first, by ___irIsClassCellDelete___:ifTrue:."

	^ (aNameAst id asSymbol ~~ #'__class__')
		and: [CallAst classBeingCompiled notNil
		and: [CallAst classBodyRuntimeClass == nil
		and: [CallAst inClassBodyValueEmit ~~ true
		and: [aNameAst ___enclosingFunctionLocalBeyondClass___: aNameAst id]]]]
%

category: 'Grail-IR Codegen'
method: DeleteAst
___irIsClassCellDelete___: aNameAst ifTrue: aBlock
	"printSmalltalkOn:'s ``nonlocal __class__; del __class__'' guard, spelled
	once so the refusal and the emit cannot disagree about which targets it
	claims."

	^ (aNameAst id asSymbol == #'__class__'
		and: [CallAst classBodyRuntimeClass == nil
		and: [CallAst classBeingCompiled notNil
		and: [CallAst inClassBodyValueEmit ~~ true
		and: [CallAst ___functionDeclaresNonlocal___: #'__class__']]]])
			ifTrue: [aBlock value]
			ifFalse: [false]
%

category: 'Grail-IR Codegen'
method: DeleteAst
___irRefusalDetail___: localSet
	"Census: which ``del'' target refused, by name rather than as one
	`shape:DeleteAst' bucket.  The two name branches the IR path cannot spell
	are different cuts -- one wants the class-body definitional store, the other
	the class cell -- and a single row cannot say which the next cut is about."

	targets do: [:t |
		(t isKindOf: NameAst) ifTrue: [
			CallAst classBodyRuntimeClass notNil ifTrue: [^ #'DeleteAst:classBody'].
			(self ___irNameTargetEligible___: t locals: localSet)
				ifFalse: [^ #'DeleteAst:name']]].
	^ #'DeleteAst:target'
%

category: 'Grail-IR Codegen'
method: DeleteAst
___emitIRStatementOn___: aBuilder
	"printSmalltalkOn:'s shapes, one statement per target:
	  del x[k]  -> (x) __delitem__: (k).
	  del o.a   -> (o) @env1:__delattr__: 'a'.   [a Smalltalk String: user
	               __delattr__ overrides compare name == 'a' str-vs-str]
	  del name  -> name := nil.                 [the local's temp; a deleted
	               parameter lives in a temp too, like a reassigned one]"

	targets do: [:t |
		(t isKindOf: NameAst)
			ifTrue: [
				aBuilder atNode: self.
				"``nonlocal __class__; del __class__'' EMPTIES the shared cell
				rather than unbinding anything -- the twin of the text's
				``<class object> @env1:___grailClearClassCell___''.  Tested
				first: ``__class__'' is a local temp here (popScope exempts the
				declared name), so the local branch below would otherwise claim
				it and nil a temp nobody reads, which is the silent no-op the
				text branch was written to end."
				(self ___irIsClassCellDelete___: t ifTrue: [true])
					ifTrue: [
						aBuilder add: (aBuilder
							send: #'___grailClearClassCell___'
							to: (self ___emitIRClassObjectOn___: aBuilder)
							with: { } env: 1)]
					ifFalse: [
				"``nonlocal x; del x'' inside a method of a METHOD-LOCAL class: the
				twin of the text's ``(self @env1:___classCellSetter___:
				#'___cellSetter_x___') value: nil''.  The name is an enclosing
				function's local reached past the class, so there is no temp here to
				nil; the store goes through the setter block the enclosing frame
				handed the class, and nil is what an unbound local holds, so the
				enclosing read guard raises UnboundLocalError afterwards.
				``value:'' is env 0 for AssignAst's reason: the setter is a Smalltalk
				one-argument block and an env-1 value: cannot exist on ExecBlock."
				(self ___irIsClosureCellDelete___: t)
					ifTrue: [
						| setter |
						CallAst addCapturedWriteName: t id.
						setter := aBuilder
							send: #'___classCellSetter___:' to: aBuilder selfNode
							with: { aBuilder obj: ('___cellSetter_' , t id asString
								, '___') asSymbol } env: 1.
						aBuilder add: (aBuilder
							send: #value: to: setter with: { aBuilder nilLit } env: 0)]
					ifFalse: [
				"``del <module name>'' REMOVES the binding, where ``del <local>''
				only nils a temp -- a later read then raises NameError rather
				than UnboundLocalError, and every other function sees it gone."
				(self isModuleScopeTarget: t)
					ifTrue: [aBuilder add: (aBuilder
						send: #'removeDynamicInstVar:'
						to: (self ___emitIRModuleReceiverOn___: aBuilder)
						with: { aBuilder obj: t id asSymbol } env: 0)]
					ifFalse: [
						| leaf |
						leaf := aBuilder leafFor: t id asSymbol.
						leaf isNil ifTrue: [
							"Eligibility judged this a local under a compile
							context the emit no longer has.  Refuse loudly: a
							silent miss here would drop the delete entirely."
							Error signal: 'IR codegen: no local temp for del '
								, t id printString].
						aBuilder add: (aBuilder assign: leaf from: aBuilder nilLit)]]]]
			ifFalse: [
				| objV |
				objV := t value ___emitIRValueOn___: aBuilder.
				(t isKindOf: SubscriptAst)
					ifTrue: [
						| idxV |
						idxV := t slice ___emitIRValueOn___: aBuilder.
						aBuilder atNode: self.
						aBuilder add: (aBuilder send: #'__delitem__:' to: objV with: { idxV } env: 1)]
					ifFalse: [
						aBuilder atNode: self.
						aBuilder add: (aBuilder
							send: #'__delattr__:' to: objV
							with: { aBuilder obj: t ___mangledAttr___ asString } env: 1)]]].
	^ self
%

category: 'Grail-IR Codegen'
method: DeleteAst
___irReadLocalNamesInto___: aSet locals: localSet
	"A bare-name target is neither read nor written here -- it is UNBOUND, which
	___irFlowBound___:locals: accounts for."

	targets do: [:t |
		(t isKindOf: NameAst) ifFalse: [
			t value ___irReadLocalNamesInto___: aSet locals: localSet.
			(t isKindOf: SubscriptAst) ifTrue: [
				t slice ___irReadLocalNamesInto___: aSet locals: localSet]]].
	^ self
%

category: 'Grail-IR Codegen'
method: DeleteAst
___irFlowBound___: boundIn locals: localSet
	"The subscript / attribute pieces are reads; a bare name leaves the bound
	set, so a later read of it makes the def ineligible and the text path's
	unbound guard raises the UnboundLocalError CPython would."

	| reads out |
	reads := Set new.
	self ___irReadLocalNamesInto___: reads locals: localSet.
	(reads allSatisfy: [:r | boundIn includes: r]) ifFalse: [^ nil].
	out := boundIn copy.
	targets do: [:t |
		(t isKindOf: NameAst) ifTrue: [out remove: t id asString ifAbsent: []]].
	^ out
%
