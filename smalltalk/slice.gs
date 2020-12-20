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
