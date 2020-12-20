! ------------------- Remove existing behavior from MatMulTestCase
expectvalue /Metaclass3       
doit
MatMulTestCase removeAllMethods.
MatMulTestCase class removeAllMethods.
%
! ------------------- Class methods for MatMulTestCase
! ------------------- Instance methods for MatMulTestCase
set compile_env: 0
category: 'other'
method: MatMulTestCase
buildMatrix: n

	| t m |
	t := 1 / n / n.
	m := (Array new: n) collect: [ :each | Array new: n ].
	0 to: n - 1 do: [ :i |
		0 to: n - 1 do: [ :j |
			(m at: i + 1) at: j + 1 put: t * (i - j) * (i + j).
		].
	].
	^ m
%
category: 'other'
method: MatMulTestCase
matMul: a _: b

	| c d |
	c := self transposeMatrix: b.
	d := (Array new: a size) collect: [ :each | Array new: (b at: 1) size ].
	1 to: a size do: [ :i |
		1 to: (b at: 1) size do: [ :j |
			| s ai cj |
			s := 0.
			ai := a at: i.
			cj := c at: j.
			1 to: b size do: [ :k |
				s := s + ((ai at: k) * (cj at: k)).
			].
			(d at: i) at: j put: s.
		].
	].
	^ d
%
category: 'other'
method: MatMulTestCase
operationBlock

	^ [ | n a b |
		n := 100.
		a := self buildMatrix: n.
		b := self buildMatrix: n.
		self matMul: a _: b.
	]
%
category: 'other'
method: MatMulTestCase
testMatMul

	^ self operationBlock value
%
category: 'other'
method: MatMulTestCase
testMatMulCpuClock

	| time |
	time := System millisecondsToRun: self operationBlock.	
	Transcript show: 'MATMUL CPU CLOCK: ', time asString; cr.
%
category: 'other'
method: MatMulTestCase
testMatMulWallClock

	| time |
	time := Time millisecondsElapsedTime: self operationBlock.	
	Transcript show: 'MATMUL WALL CLOCK: ', time asString; cr.
%
category: 'other'
method: MatMulTestCase
transposeMatrix: n

	| m |
	m := (Array new: (n at: 1) size) collect: [ :each | Array new: n size ].
	0 to: (n at: 1) size - 1 do: [ :i |
		0 to: n size - 1 do: [ :j |
			(m at: i + 1) at: j + 1 put: ((n at: j + 1) at: i + 1).
		].
	].
	^ m
%
