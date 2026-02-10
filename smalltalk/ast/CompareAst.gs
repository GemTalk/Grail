! ------------------- Remove existing behavior from CompareAst
removeallmethods CompareAst
removeallclassmethods CompareAst
set compile_env: 0
! ------------------- Class methods for CompareAst
! ------------------- Instance methods for CompareAst
category: 'other'
method: CompareAst
printSmalltalkOn: aStream

	cmpopList size == 1 ifTrue: [
		(cmpopList first) printSmalltalkOn: aStream left: left rightList: comparatorList.
		^self.
	].
	"Chained comparisons not yet supported"
	self halt.
%
