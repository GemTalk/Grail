! ------------------- Remove existing behavior from TupleAst
removeallmethods TupleAst
removeallclassmethods TupleAst
set compile_env: 0
! ------------------- Class methods for TupleAst
! ------------------- Instance methods for TupleAst
category: 'other'
method: TupleAst
addVariableNamesTo: aStream

	elts do: [:each | 
		each addVariableNamesTo: aStream.
	].
%
category: 'other'
method: TupleAst
declareVariable

	elts do: [:each | each declareVariable].
%
category: 'other'
method: TupleAst
printSmalltalkAssignmentOn: aStream 

	1 to: elts size do: [:i | 
		(elts at: i) printSmalltalkOn: aStream.
		aStream 
			nextPutAll: '(value at: ';
			print: i;
			nextPutAll: ').'; lf.
	].
	aStream skip: -2.
%
category: 'other'
method: TupleAst
printSmalltalkOn: aStream

	elts isEmpty ifTrue: [
		aStream nextPutAll: '(InvariantArray perform: #new env: 0)'.
		^self.
	].
	aStream nextPutAll: '(InvariantArray perform: #withAll: env: 0 withArguments: {{'.
	elts doWithIndex: [:each :i |
		i > 1 ifTrue: [aStream nextPutAll: '. '].
		each printSmalltalkOn: aStream.
	].
	aStream nextPutAll: '}})'.
%
category: 'other'
method: TupleAst
setTo: aValue scope: aScope

	elts size ~~ aValue ___size ifTrue: [
		ValueError signal: 'not enough values to unpack (expected ' , elts size printString , ', got ' , aValue ___size printString , ')'.
	].
	1 to: elts size do: [:i | 
		(elts at: i) setTo: (aValue ___at: i) scope: aScope.
	].
%
