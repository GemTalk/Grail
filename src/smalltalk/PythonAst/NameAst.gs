! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for NameAst
expectvalue /Class
doit
ExpressionAst subclass: 'NameAst'
  instVarNames: #( id ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
NameAst comment: 
'Names refer to objects. Names are introduced by name binding operations.

The following constructs bind names: formal parameters to functions, import statements, class and function definitions (these bind the class or function name in the defining block), and targets that are identifiers if occurring in an assignment, for loop header, or after as in a with statement or except clause. The import statement of the form from ... import * binds all names defined in the imported module, except those beginning with an underscore. This form may only be used at the module level.

A target occurring in a del statement is also considered bound for this purpose (though the actual semantics are to unbind the name).

Each assignment or import statement occurs within a block defined by a class or function definition or at the module level (the top-level code block).

If a name is bound in a block, it is a local variable of that block, unless declared as nonlocal or global. If a name is bound at the module level, it is a global variable. (The variables of the module code block are local and global.) If a variable is used in a code block but not defined there, it is a free variable.

Each occurrence of a name in the program text refers to the binding of that name established by certain name resolution rules.




https://docs.python.org/3/reference/executionmodel.html#naming-and-binding'
%

expectvalue /Class
doit
NameAst category: 'Parser'
%

! ------------------- Remove existing behavior from NameAst
removeallmethods NameAst
removeallclassmethods NameAst

set compile_env: 0

category: 'other'
classmethod: NameAst
with: aSymbol

	^self basicNew
		id: aSymbol;
		yourself
%

category: 'other'
method: NameAst
addVariableNamesTo: aStream

	
	aStream nextPutAll: id; space.
%

category: 'other'
method: NameAst
assertContextIsLoad

	ctx assertIsLoad.
%

category: 'other'
method: NameAst
assertContextIsStore

	ctx assertIsStore.
%

category: 'other'
method: NameAst
ctx: aContext

	ctx := aContext.
%

category: 'other'
method: NameAst
declareVariable

	parent declareVariable: id.
%

category: 'other'
method: NameAst
id

	^id
%

category: 'other'
method: NameAst
id: aSymbol

	id := aSymbol
%

category: 'other'
method: NameAst
injectSuperArguments: anArray scope: aScope

	| type objectOrType |
	type := aScope superInfo
		at: #'type'
		ifAbsent: [].
	objectOrType := aScope superInfo
		at: #'objectOrType'
		ifAbsent: [].
	(((type isNil not) and: [objectOrType isNil not]) and: [id == #'super']) ifTrue: ["in case of calling super"
		anArray add: type.
		anArray add: objectOrType.
	].
%

category: 'other'
method: NameAst
printOn: aStream

	super printOn: aStream.
	aStream nextPut: $(;
		nextPutAll: id;
		nextPut: $).
%

category: 'other'
method: NameAst
printSmalltalkAssignmentOn: aStream

	self printSmalltalkOn: aStream.
	aStream nextPutAll: 'value'.
%

category: 'other'
method: NameAst
printSmalltalkOn: aStream
	"Name dispatch — see docs/Rewrite_Dispatch_Model.md.

	When a name in load context resolves to a fast-path builtin method,
	emit a BoundMethod wrapper instead of the bare identifier. This makes
	first-class function uses like `f = abs; f(-5)` work without going
	through the legacy block-in-symbol-list path.

	`Fast-path builtin' here means: the name is not shadowed by a local in
	any enclosing scope, and the builtins class has at least one env-1
	method whose Smalltalk selector base matches this name (`abs`, `abs:`,
	`abs:_:`, etc.). The BoundMethod stores the unary selector (Python
	0-arg form) by convention, and forwards calls via reflective dispatch;
	a future revision can use the actual call-site arity if known.

	Note: this method is called for both load and store contexts —
	`AssignAst >> printSmalltalkOn:` invokes it on its target (LHS) too.
	The unbound-local check (Phase C-2) only applies in load context;
	stores must emit the bare identifier so the surrounding
	`<name> := <value>` is well-formed.

	Direct call sites like `abs(5)` are special-cased in
	`CallAst>>printSmalltalkOn:` and bypass this method entirely."

	"self parameter in class method → Smalltalk self"
	(CallAst isSelfReference: id) ifTrue: [
		aStream nextPutAll: 'self'.
		^ self
	].
	(self isFastPathBuiltinName) ifTrue: [
		aStream
			nextPutAll: '(BoundMethod receiver: ((Python @env0:at: #builtins) instance) selector: #';
			nextPutAll: id;
			nextPutAll: ')'.
		^ self
	].
	"Class-method free-variable fast path: when compiling a Python class
	body, a free name that isn't a local or a class inst var still
	resolves through Python's LEGB rules to the enclosing module's
	globals.  Detect that case BEFORE the UnboundLocalError wrap below —
	otherwise `isVariableIsDeclared:` walks up to the module body's
	BlockAst, sees the name declared there, and wraps it in a check that
	reads the name as a Smalltalk local (which fails at compile time
	because class methods don't have module inst vars in scope)."
	((ctx isKindOf: LoadAst)
		and: [CallAst classBeingCompiled notNil
			and: [CallAst moduleClassBeingCompiled notNil
				and: [self isModuleScopeName: id]]])
		ifTrue: [
			"For a module-level function name, emit a fresh BoundMethod
			pointing at the module instance — there is no unary accessor
			(adding one would shadow 0-arg call dispatch).  For other
			module variables, fetch through the unary accessor."
			(CallAst moduleFunctionNames notNil
				and: [CallAst moduleFunctionNames includes: id asSymbol])
				ifTrue: [
					aStream
						nextPutAll: '(BoundMethod receiver: (';
						nextPutAll: CallAst moduleClassBeingCompiled name;
						nextPutAll: ' @env0:___instance___) selector: #';
						nextPutAll: id;
						nextPutAll: ')'.
				] ifFalse: [
					aStream
						nextPutAll: '((';
						nextPutAll: CallAst moduleClassBeingCompiled name;
						nextPutAll: ' @env0:___instance___) @env1:';
						nextPutAll: id;
						nextPutAll: ')'.
				].
			^self
		].
	"Phase C-2: in load context, wrap reads of declared locals with a
	runtime nil-check that raises UnboundLocalError naming the variable.
	Stores and undeclared (free / global / builtin) names emit the bare
	identifier — those resolve through the symbol list and are caught by
	the env-1 DNU backstop if they reach a message send while nil."
	((ctx isKindOf: LoadAst) and: [self isVariableIsDeclared: id]) ifTrue: [
		aStream
			nextPutAll: '(UnboundLocalError @env0:___checkLocal: ';
			nextPutAll: id;
			nextPutAll: ' named: #';
			nextPutAll: id;
			nextPutAll: ')'.
		^ self
	].
	aStream nextPutAll: id.
%

category: 'other'
method: NameAst
isModuleScopeName: aSymbol
	"True if aSymbol is in the enclosing module class's inst vars.
	Python's LEGB free-variable lookup inside a class method body
	does NOT include the class scope — bare names skip past the
	class to the module's globals.  So we do not shadow on class
	inst vars or class method names; the only thing that takes
	precedence is the self parameter (a real local of the method)."

	| modCls |
	modCls := CallAst moduleClassBeingCompiled.
	modCls ifNil: [^false].
	(modCls allInstVarNames includes: aSymbol asSymbol) ifFalse: [^false].
	(CallAst selfParameterName notNil
		and: [CallAst selfParameterName asSymbol = aSymbol asSymbol])
			ifTrue: [^false].
	^ true
%

category: 'other'
method: NameAst
isFastPathBuiltinName
	"True if this load-context read names a builtin that the codegen
	considers fast-path eligible (any arity), and is not shadowed by an
	enclosing-scope local.

	Returns false when this NameAst is the function position of a CallAst
	— in that case, CallAst>>printSmalltalkOn: has already decided whether
	to emit the fast path or fall through to the legacy varargs path. We
	must not wrap the function in a BoundMethod and force the legacy path
	through reflective dispatch."

	(self isFunctionPositionOfCall) ifTrue: [^false].
	(self isVariableIsDeclared: id) ifTrue: [^false].
	^ self class isFastPathBuiltinName: id
%

category: 'other'
method: NameAst
isFunctionPositionOfCall
	"True if this NameAst is the `function` of an enclosing CallAst (i.e.
	`name(...)`-style call site). Used to suppress the BoundMethod special
	case when the name is being called directly."

	(parent isKindOf: CallAst) ifFalse: [^false].
	^ parent function == self
%

category: 'other'
classmethod: NameAst
isFastPathBuiltinName: aSymbol
	"Return true if `builtins` has any env-1 fast-path method matching
	`aSymbol`. Delegates to the general form with builtins as the class."

	^ self isFastPathBuiltinName: aSymbol on: builtins
%

category: 'other'
classmethod: NameAst
isFastPathBuiltinName: aSymbol on: aClass
	"Return true if `aClass` has any env-1 fast-path method matching
	`aSymbol`. We check the common fixed-arity keyword forms (`aSymbol:`,
	`aSymbol:_:`, `aSymbol:_:_:`) plus the varargs form (`_aSymbol:kw:`),
	since walking the entire env-1 method dict per Name reference would
	be too expensive at codegen time.

	Note: we deliberately do NOT check the bare unary `aSymbol` form,
	because that selector may be a legacy block-getter on unconverted
	modules, or a stored-attribute accessor on converted modules."

	| md s |
	md := aClass methodDictForEnv: 1.
	s := aSymbol asString.
	(md includesKey: (s , ':') asSymbol) ifTrue: [^true].
	(md includesKey: (s , ':_:') asSymbol) ifTrue: [^true].
	(md includesKey: (s , ':_:_:') asSymbol) ifTrue: [^true].
	(md includesKey: ('_' , s , ':kw:') asSymbol) ifTrue: [^true].
	^ false
%

category: 'other'
method: NameAst
setTo: aValue scope: aScope

	self assertContextIsStore.
	aScope set: id to: aValue.
%
