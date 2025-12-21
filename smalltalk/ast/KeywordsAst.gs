! ------------------- Remove existing behavior from KeywordsAst
removeallmethods KeywordsAst
removeallclassmethods KeywordsAst
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
category: 'other'
method: KeywordsAst
initialize

	super initialize.
	self halt.
%
