! ------------------- Remove existing behavior from slice
removeAllMethods slice
removeAllClassMethods slice
! ------------------- Class methods for slice
set compile_env: 0
category: 'other'
classmethod: slice
start: aStart stop: aStop step: aStep

	^ self basicNew
		initialize: aStart _: aStop _: aStep;
		yourself
%
! ------------------- Instance methods for slice
set compile_env: 0
category: 'other'
method: slice
evaluate: container scope: aScope

	| from to by result|
	from 	:= start value 	isNone ifFalse: [start value ___number + 1] 	ifTrue: [1].
	to 	:= stop value 	isNone ifFalse: [stop value ___number] 		ifTrue: [container ___size].
	by		:= step value	isNone ifFalse: [step value ___number + 1] 	ifTrue: [1].
	result := Array new.
	from to: to by: by do: [:i | 
		result add: (container ___at: i).
	].
	^container class withAll: result
%
category: 'other'
method: slice
initialize: aStart _: aStop _: aStep

	start := aStart.
	stop := aStop.
	step := aStep.
%
category: 'other'
method: slice
start

	^ start
%
category: 'other'
method: slice
step

	^ step
%
category: 'other'
method: slice
stop

	^ stop
%
