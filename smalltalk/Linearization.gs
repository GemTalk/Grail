! ------------------- Remove existing behavior from Linearization
expectvalue /Metaclass3       
doit
Linearization removeAllMethods.
Linearization class removeAllMethods.
%
! ------------------- Class methods for Linearization
set compile_env: 0
category: 'other'
classmethod: Linearization
findGoodHead: linearizations

	| heads |
	heads := Linearization getHeads: linearizations.
	1 to: heads size do: [ :i | | head tails |
		head := heads at: i.
		tails := Linearization getTails: linearizations index: i.
		(Linearization head: head notInTail: tails) ifTrue: [ ^ head ].
	].
	^ nil
%
category: 'other'
classmethod: Linearization
getHeads: linearizations

	^ linearizations collect: [ :linearization | linearization at: 1 ]
%
category: 'other'
classmethod: Linearization
getTails: linearizations index: i

	| tails |
	tails := Array new.
	1 to: linearizations size do: [ :j | 
		| linearization |
		linearization := linearizations at: j.
		((j ~~ i) and: [ linearization size > 1 ]) ifTrue: [ 
			tails add: (linearization copyFrom: 2 to: linearization size).
		].
	].
	^ tails
%
category: 'other'
classmethod: Linearization
head: head notInTail: tails

	1 to: tails size do: [ :i |
		| tail |
		tail := tails at: i.
		(tail includes: head) ifTrue: [ ^ false ] 
	].
	^ true
%
category: 'other'
classmethod: Linearization
merge: linearizations

	| merged remainingHeads goodHead |
	merged := Array new.
	remainingHeads := linearizations.
	goodHead := Linearization findGoodHead: remainingHeads.
	[ goodHead isNil ] whileFalse: [ 
		merged add: goodHead.
		remainingHeads := Linearization removeHead: goodHead from: remainingHeads.
		goodHead := Linearization findGoodHead: remainingHeads.
	].
	^ merged
%
category: 'other'
classmethod: Linearization
removeHead: head from: linearizations

	| heads |
	heads := Array new.
	1 to: linearizations size do: [ :i | 
		| linearization |
		linearization := linearizations at: i.
		(((linearization at: 1) = head) and: [ linearization size > 1 ]) ifTrue: [ heads add: (linearization copyFrom: 2 to: linearization size) ].
		((linearization at: 1) ~~ head) ifTrue: [ heads add: linearization copy ].
	].
	^ heads
%
! ------------------- Instance methods for Linearization
set compile_env: 0
