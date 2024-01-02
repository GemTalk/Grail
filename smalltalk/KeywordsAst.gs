! ------------------- Remove existing behavior from KeywordsAst
expectvalue /Metaclass3
doit
KeywordsAst removeAllMethods.
KeywordsAst class removeAllMethods.
%
! ------------------- Class methods for KeywordsAst
set compile_env: 0
category: 'other'
classmethod: KeywordsAst
from: anArray

	^anArray first value changeClassTo: self
%
! ------------------- Instance methods for KeywordsAst
set compile_env: 0
category: 'other'
method: KeywordsAst
do: aBlock
	"provide the protocol of a SymbolDictionary"

	aBlock value: self.
%
category: 'other'
method: KeywordsAst
initialize

	super initialize.
	self halt.
%
