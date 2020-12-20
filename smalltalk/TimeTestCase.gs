! ------------------- Remove existing behavior from TimeTestCase
removeAllMethods TimeTestCase
removeAllClassMethods TimeTestCase
! ------------------- Class methods for TimeTestCase
set compile_env: 0
category: 'other'
classmethod: TimeTestCase
filename

	^'time.py'
%
! ------------------- Instance methods for TimeTestCase
set compile_env: 0
category: 'other'
method: TimeTestCase
test_time

	| x |
	module evaluate.
	x := stdout contents asNumber.	"time.sleep(0.01)"
	self assert: (0.009 < x and: [x < 0.015]).
%
