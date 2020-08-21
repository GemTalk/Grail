! ------------------- Remove existing behavior from AbstractNumber
expectvalue /Metaclass3       
doit
AbstractNumber removeAllMethods.
AbstractNumber class removeAllMethods.
%
! ------------------- Class methods for AbstractNumber
set compile_env: 0
category: 'other'
classmethod: AbstractNumber
with: aNumber

	| num |
	num := aNumber.
	(aNumber class == self) ifTrue: [ ^ aNumber ].
	(aNumber isKindOf: str) ifTrue: [ ^ self withString: aNumber ].
	(aNumber isKindOf: AbstractNumber) 
		ifTrue: [
			(aNumber _generality < self _generality) 
				ifTrue: [ num := aNumber ___number ]
				ifFalse: [ num := aNumber __int__ value: aNumber ].
		].
	^self basicNew
		___initialize: num;
		yourself
%
category: 'other'
classmethod: AbstractNumber
with: aNumber base: aBase

	| num base |
	num := aNumber.
	base := aBase.
	(aBase isKindOf: AbstractNumber) ifTrue: [ base := aBase ___number ].
	(aNumber class == self) ifTrue: [ ^ aNumber ].
	(aNumber isKindOf: str) ifTrue: [ ^ self withString: aNumber base: base ].
	(aNumber isKindOf: AbstractNumber) 
		ifTrue: [
			(aNumber _generality < self _generality) 
				ifTrue: [ num := aNumber ___number ]
				ifFalse: [ num := aNumber __int__ value: aNumber ].
		].
	^self basicNew
		___initialize: num base: base;
		yourself
%
! ------------------- Instance methods for AbstractNumber
set compile_env: 0
category: 'Arithmetic'
method: AbstractNumber
- aNumber

	(self class == aNumber class) ifTrue: [ ^ self __sub__ value: self value: aNumber ].
	^ self _retry: #- coercing: aNumber
%
category: 'Arithmetic'
method: AbstractNumber
* aNumber

	(self class == aNumber class) ifTrue: [ ^ self __mul__ value: self value: aNumber ].
	^ self _retry: #* coercing: aNumber
%
category: 'Arithmetic'
method: AbstractNumber
/ aNumber

	(self class == aNumber class) ifTrue: [ ^ self __truediv__ value: self value: aNumber ].
	^ self _retry: #/ coercing: aNumber
%
category: 'Arithmetic'
method: AbstractNumber
+ aNumber

	(self class == aNumber class) ifTrue: [ ^ self __add__ value: self value: aNumber ].
	^ self _retry: #+ coercing: aNumber
%
category: 'Arithmetic'
method: AbstractNumber
= anObject

	| res temp |
	res := ((temp := self __eq__ value: self value: anObject) == True).
	^ res
%
set compile_env: 0
category: 'other'
method: AbstractNumber
floor

	^ number floor
%
set compile_env: 0
category: 'overrides'
method: AbstractNumber
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		print: number;
		nextPut: $);
		yourself.
%
set compile_env: 0
category: 'private'
method: AbstractNumber
___initialize: aNumber

	number := aNumber
%
category: 'private'
method: AbstractNumber
___number

	^number
%
set compile_env: 0
category: 'Python'
method: AbstractNumber
__bool__

	^ [ :rhs | rhs ___number = 0 ifTrue: [ False ] ifFalse: [ True ] ]
%
category: 'Python'
method: AbstractNumber
__eq__

	^ [ :lhs :rhs |
		| lnum rnum temp |
		lnum := lhs.
		rnum := rhs.
		(lhs isKindOf: AbstractNumber) ifTrue: [ lnum := lhs ___number ].
		(rhs isKindOf: AbstractNumber) ifTrue: [ rnum := rhs ___number ].
		(temp := (lnum == rnum)) ifTrue: [ True ] ifFalse: [ False ]
	]
%
category: 'Python'
method: AbstractNumber
__mul__

	^ [ :lhs :rhs | self class with: (lhs.number * rhs.number) ]
%
category: 'Python'
method: AbstractNumber
__str__

	^[:num | str withAll: num ___number printString]
%
category: 'Python'
method: AbstractNumber
__sub__

	^ [ :lhs :rhs | self class with: (lhs.number - rhs.number) ]
%
category: 'Python'
method: AbstractNumber
_retry: aSelector coercing: aNumber

"A difference in representation between the receiver and aNumber has prevented
 aSelector from being executed.  Coerce either the receiver or aNumber to the
 higher of their generalities and attempt to execute the method represented by
 aSelector again. 

 This is the basis of the type coercion logic for all Numbers."
| gen argGen |
" numeric primitives #=, #~= check for   (anArg isKindOf: Number)
  and if that result is  false ,   the compare result is returned
  directly by those primitives
"
gen := self _generality .
argGen := aNumber _generality .
(gen < argGen ) ifTrue: [
  ^ (aNumber _coerce: self) perform: aSelector with: aNumber
].
(gen > argGen ) ifTrue: [
  ^self perform: aSelector with: (self _coerce: aNumber)
].
self _uncontinuableError.  "coercion failed"
%
