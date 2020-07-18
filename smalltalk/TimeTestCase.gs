! ------------------- Remove existing behavior from TimeTestCase
expectvalue /Metaclass3       
doit
TimeTestCase removeAllMethods.
TimeTestCase class removeAllMethods.
%
! ------------------- Class methods for TimeTestCase
set compile_env: 0
category: 'other'
classmethod: TimeTestCase
filename

	^'Time.py'
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
