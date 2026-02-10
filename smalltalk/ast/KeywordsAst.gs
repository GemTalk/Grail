! ------------------- Remove existing behavior from KeywordsAst
removeallmethods KeywordsAst
removeallclassmethods KeywordsAst
set compile_env: 0
! ------------------- Class methods for KeywordsAst
category: 'other'
classmethod: KeywordsAst
from: anArray

	^anArray first value changeClassTo: self
%
! ------------------- Instance methods for KeywordsAst
category: 'other'
method: KeywordsAst
do: aBlock
	"provide the protocol of a SymbolDictionary"

	aBlock value: self.
%
