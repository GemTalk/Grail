! ------------------- Remove existing behavior from math
removeallmethods math
removeallclassmethods math
! ------------------- Class methods for math
! ------------------- Instance methods for math
category: 'other'
method: math
comb

	| function |
	function := FunctionDef new
		params: #( #'n' #'k' );
		yourself.
	function block: [:currentScope |
		| n k |
		n := currentScope at: #n.
		k := currentScope at: #k.
		(n isKindOf: int) ifFalse: [TypeError signal: '''' , n class name , ''' cannot be interpreted as an integer'].
		(k isKindOf: int) ifFalse: [TypeError signal: '''' , k class name , ''' cannot be interpreted as an integer'].
		n := n ___value.
		k := k ___value.
		n >= 0 ifFalse: [ValueError signal: 'comb() not defined for negative values'].
		k >= 0 ifFalse: [ValueError signal: 'comb() not defined for negative values'].
		int ___value: (k <= n ifTrue: [
			n factorial / (k factorial * (n - k) factorial).
		] ifFalse: [
			0.
		]).
	].
	^function.
%
category: 'other'
method: math
factorial

	| function |
	function := FunctionDef new
		params: #( #n );
		yourself.
	function block: [:currentScope |
		| n |
		n := currentScope at: #n.
		(n isKindOf: int) ifFalse: [TypeError signal: '''' , n class name , ''' cannot be interpreted as an integer'].
		n ___value >= 0 ifFalse: [ValueError signal: 'factorial() not defined for negative values'].
		int ___value: n ___value factorial.
	].
	^function.
%
category: 'other'
method: math
gcd

	| function |
	function := FunctionDef new
		vararg: #ints;
		yourself.
	function block: [:currentScope |
		| ints integers |
		ints := (currentScope at: #ints) ___value.
		integers := Array new: ints size.
		1 to: ints size do: [:i | 
			| n |
			n := ints at: i.
			(n isKindOf: int) ifFalse: [TypeError signal: '''' , n class name , ''' cannot be interpreted as an integer'].
			integers at: i put: n ___value.
		].
		integers size == 0 ifTrue: [
			int ___value: 0.
		] ifFalse: [integers size == 1 ifTrue: [
			ints at: 1.
		] ifFalse: [
			| gcd |
			gcd := (integers at: 1) gcd: (integers at: 2).
			3 to: ints size do: [:i |
				gcd := gcd gcd: (integers at: i).
			].
			int ___value: gcd.
		]].
	].
	^function.
%
category: 'other'
method: math
isqrt

	| function |
	function := FunctionDef new
		params: #( #n );
		yourself.
	function block: [:currentScope |
		| n |
		n := currentScope at: #n.
		(n isKindOf: int) ifFalse: [TypeError signal: '''' , n class name , ''' cannot be interpreted as an integer'].
		n ___value >= 0 ifFalse: [ValueError signal: 'isqrt() argument must be nonnegative'].
		int ___value: (n ___value sqrt) floor.
	].
	^function.
%
