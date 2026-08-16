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
