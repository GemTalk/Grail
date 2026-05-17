! ------------------- Superclass check
run
NameAst ifNil: [self error: 'NameAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for KeywordsAst
expectvalue /Class
doit
NameAst subclass: 'KeywordsAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
KeywordsAst comment:
'Grail-specific helper class for managing keyword arguments.

This is not a standard Python AST node, but a Grail implementation detail for managing collections of keyword arguments in function calls.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        NameAst(assoc id ctx)
          KeywordsAst
'
%

expectvalue /Class
doit
KeywordsAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from KeywordsAst
removeallmethods KeywordsAst
removeallclassmethods KeywordsAst

set compile_env: 0

category: 'Grail-other'
classmethod: KeywordsAst
from: anArray

	^anArray first value changeClassTo: self
%

category: 'Grail-other'
method: KeywordsAst
do: aBlock
	"provide the protocol of a SymbolDictionary"

	aBlock value: self.
%
