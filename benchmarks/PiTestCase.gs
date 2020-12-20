! ------------------- Remove existing behavior from PiTestCase
expectvalue /Metaclass3       
doit
PiTestCase removeAllMethods.
PiTestCase class removeAllMethods.
%
! ------------------- Class methods for PiTestCase
! ------------------- Instance methods for PiTestCase
set compile_env: 0
category: 'other'
method: PiTestCase
calculatePi: n
"https://mathworld.wolfram.com/PiFormulas.html"

	| pi |
	pi := 0.
	0 to: n do: [ :k |
		pi := pi + ((2 raisedTo: k) * (k factorial raisedTo: 2) / (2*k + 1) factorial).
	].
	pi := 2 * pi.
	^ pi
%
category: 'other'
method: PiTestCase
operationBlock

	^ [ | n |
		n := 100.
		self calculatePi: n.
	]
%
category: 'other'
method: PiTestCase
testPiCpuClock

	| time |
	time := System millisecondsToRun: self operationBlock.	
	Transcript show: 'PI CPU CLOCK: ', time asString; cr.
%
category: 'other'
method: PiTestCase
testPiWallClock

	| time |
	time := Time millisecondsElapsedTime: self operationBlock.	
	Transcript show: 'PI WALL CLOCK: ', time asString; cr.
%
