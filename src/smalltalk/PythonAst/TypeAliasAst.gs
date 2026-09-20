! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypeAliasAst
expectvalue /Class
doit
StatementAst subclass: 'TypeAliasAst'
  instVarNames: #( name value assign)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
TypeAliasAst comment:
'https://docs.python.org/3/library/ast.html#ast.TypeAlias

PEP 695''s ``type X = int'' statement.

``type'' is a SOFT keyword -- it is the builtin everywhere else -- so
``type(x)'', ``type = 5'' and ``isinstance(x, type)'' all keep working;
see PythonParser >> atTypeAliasStatement for how the two are told apart.

The VALUE is lazy.  PEP 695 evaluates it on first access to
``__value__'', which is what lets an alias refer to a name defined later
in the module, or to itself (``type Json = int | list[Json]'').
Evaluating it eagerly would turn that into a NameError at the point of
definition, so codegen emits the value as a THUNK.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        TypeAliasAst(name value)
'
%

expectvalue /Class
doit
TypeAliasAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from TypeAliasAst
removeallmethods TypeAliasAst
removeallclassmethods TypeAliasAst

set compile_env: 0

category: 'Grail-other'
method: TypeAliasAst
printSmalltalkOn: aStream
	"Delegate to the AssignAst the parser built.

	A type alias BINDS its name exactly as an assignment does, and
	``exactly as'' is a long cascade -- module scope, doit globals,
	class-method nonlocals, class-body attributes.  Emitting ``X := ...''
	here reproduced none of it, and a module-level ``type X = int''
	compiled to an undefined symbol.  Reusing AssignAst is not a shortcut;
	it is the only way the two stay in step."

	^ assign printSmalltalkOn: aStream
%

method: TypeAliasAst
name
	^name
%

method: TypeAliasAst
name: newValue
	name := newValue
%

method: TypeAliasAst
value
	^value
%

method: TypeAliasAst
value: newValue
	value := newValue
%

method: TypeAliasAst
assign
	^assign
%

method: TypeAliasAst
assign: newValue
	assign := newValue
%

category: 'Grail-IR Codegen'
method: TypeAliasAst
___irEligibleStatementLocals___: localNames
	"DELEGATE TO THE AssignAst THE PARSER BUILT, exactly as printSmalltalkOn:
	does, and for the same reason it gives: a type alias BINDS its name exactly
	as an assignment does, and ``exactly as'' is a long cascade -- module scope,
	doit globals, class-method nonlocals, class-body attributes.  Reproducing
	any of it here would be a second copy that drifts; delegating is the only
	way the two stay in step.

	This node had NO IR protocol at all, so every def holding one refused with
	the default `stmt:TypeAliasAst' (test_global's test_type_alias)."

	^ assign ___irEligibleStatementLocals___: localNames
%

category: 'Grail-IR Codegen'
method: TypeAliasAst
___emitIRStatementOn___: aBuilder
	^ assign ___emitIRStatementOn___: aBuilder
%

category: 'Grail-IR Codegen'
method: TypeAliasAst
___irRefusalDetail___: localSet
	"The refusal the ASSIGNMENT gives, not `stmt:TypeAliasAst' -- the census
	should name the shape that actually refused, so the next cut is about the
	binding form and not about this wrapper."

	^ assign ___irRefusalDetail___: localSet
%

category: 'Grail-IR Codegen'
method: TypeAliasAst
___irLocalWriteTarget___: localSet
	^ assign ___irLocalWriteTarget___: localSet
%

category: 'Grail-IR Codegen'
method: TypeAliasAst
___irTopLevelWriteNames___: localSet
	^ assign ___irTopLevelWriteNames___: localSet
%

category: 'Grail-IR Codegen'
method: TypeAliasAst
___irWriteLocalNamesInto___: aSet locals: localSet
	^ assign ___irWriteLocalNamesInto___: aSet locals: localSet
%

category: 'Grail-IR Codegen'
method: TypeAliasAst
___irReadLocalNamesInto___: aSet locals: localSet
	^ assign ___irReadLocalNamesInto___: aSet locals: localSet
%
