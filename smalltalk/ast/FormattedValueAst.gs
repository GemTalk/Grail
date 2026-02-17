! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for FormattedValueAst
expectvalue /Class
doit
ExpressionAst subclass: 'FormattedValueAst'
  instVarNames: #( value conversion format_spec)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
FormattedValueAst comment:
'https://docs.python.org/3/library/ast.html#ast.FormattedValue

Node representing a single formatting field in an f-string.

value is any expression node (such as a literal, a variable, or a function call).
conversion is an integer:
  -1: no formatting
  97 (ord(''a'')): !a ASCII formatting
  114 (ord(''r'')): !r repr() formatting
  115 (ord(''s'')): !s string formatting
format_spec is a JoinedStr node representing the formatting of the value, or None if no format was specified.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        FormattedValueAst(value conversion format_spec)
'
%

expectvalue /Class
doit
FormattedValueAst category: 'Parser'
%

! ------------------- Remove existing behavior from FormattedValueAst
removeallmethods FormattedValueAst
removeallclassmethods FormattedValueAst
set compile_env: 0
! ------------------- Class methods for FormattedValueAst
! ------------------- Instance methods for FormattedValueAst
