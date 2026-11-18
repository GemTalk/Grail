"
GrailShardPlan: how the SUnit gate splits the suite into shards.

The test that matters is #testEveryTestRunsExactlyOnce: on the REAL suite and
the committed timings file, at the worker counts the gate uses, the shards'
union is the whole suite and no test is on two shards.  The rest pin the
assignment rule on small synthetic inputs.  A plan only reads each leaf's
class name, so the synthetic leaves are plain collections.
"
Class {
	#name : 'GrailShardPlanTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-helpers' }
GrailShardPlanTestCase >> leaves: aCollectionOfAssociations [
	"Synthetic leaves: for each prototype -> n, n instances of its class."

	| leaves |
	leaves := OrderedCollection new.
	aCollectionOfAssociations do: [:each |
		each value timesRepeat: [leaves add: each key copy]].
	^ leaves

]

{ #category : 'Grail-helpers' }
GrailShardPlanTestCase >> nameOf: anObject [

	^ anObject class name asString

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testCommittedTimingsFileParses [
	"The gate reads this file; an unreadable one would silently fall back to
	balancing counts."

	| timings |
	timings := GrailShardPlan readTimings: GrailShardPlan defaultTimingsPath.
	self deny: timings isEmpty.
	timings keysAndValuesDo: [:name :ms |
		self assert: (ms isKindOf: Integer).
		self assert: ms >= 0]

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testDigestIsDeterministic [

	| leaves timings a b |
	leaves := self leaves: {Set new -> 3. Bag new -> 2. Array new -> 4}.
	timings := Dictionary new.
	timings at: (self nameOf: Set new) put: 70.
	a := GrailShardPlan workers: 2 leaves: leaves timings: timings reserveMs: 0.
	b := GrailShardPlan workers: 2 leaves: leaves copy timings: timings copy reserveMs: 0.
	self assert: a digest = b digest.
	#(0 1) do: [:i | self assert: (a classesOn: i) asArray = (b classesOn: i) asArray]

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testEveryTestRunsExactlyOnce [
	"The coverage invariant, on the real suite: at each worker count, every
	class is on exactly one shard in range, and the shards' test counts add up
	to the whole suite."

	| leaves timings classes |
	leaves := GrailShardPlan leavesOf: PythonTestCase suite.
	timings := GrailShardPlan readTimings: GrailShardPlan defaultTimingsPath.
	classes := (leaves collect: [:each | self nameOf: each]) asSet.
	#(1 2 8 16) do: [:n | | plan seen total |
		plan := GrailShardPlan workers: n leaves: leaves timings: timings reserveMs: 200000.
		self assert: plan suiteSize = leaves size.
		seen := Set new.
		total := 0.
		0 to: n - 1 do: [:i |
			(plan classesOn: i) do: [:each |
				self deny: (seen includes: each).
				seen add: each.
				self assert: (plan shardOf: each) = i].
			total := total + (plan testCountOn: i)].
		self assert: seen = classes.
		self assert: total = leaves size.
		leaves do: [:each | | s |
			s := plan shardOf: (self nameOf: each).
			self assert: (s between: 0 and: n - 1)]]

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testLongestFirstToLeastLoaded [
	"100 -> 0, 60 -> 1, 50 -> 1 (60 < 100), 40 -> 0 (100 < 110)."

	| leaves timings plan |
	leaves := self leaves: {Set new -> 1. Bag new -> 1. Array new -> 1. OrderedCollection new -> 1}.
	timings := Dictionary new.
	timings at: (self nameOf: Set new) put: 100.
	timings at: (self nameOf: Bag new) put: 60.
	timings at: (self nameOf: Array new) put: 50.
	timings at: (self nameOf: OrderedCollection new) put: 40.
	plan := GrailShardPlan workers: 2 leaves: leaves timings: timings reserveMs: 0.
	self assert: plan isTimed.
	self assert: (plan shardOf: (self nameOf: Set new)) = 0.
	self assert: (plan shardOf: (self nameOf: Bag new)) = 1.
	self assert: (plan shardOf: (self nameOf: Array new)) = 1.
	self assert: (plan shardOf: (self nameOf: OrderedCollection new)) = 0.
	self assert: (plan plannedMsOn: 0) = 140.
	self assert: (plan plannedMsOn: 1) = 110

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testMemoryBalancesWhatTimeAloneStacks [
	"Set and OrderedCollection each retain 1000 KB, Bag and Array nothing.
	By time alone (100, 60, 50, 40) Set and OrderedCollection share shard 0,
	which ends with all 2000 KB.  With memory, the two go to different
	shards and each ends with 1000.

	Worked: T = 250 ms, M = 2000 KB.  Ranked by max(t*M, m*T): OC and Set
	250000 (name breaks the tie), Bag 120000, Array 100000.  OC -> 0; Set ->
	1 (500000 on 0, 250000 on 1); Bag -> 0 (250000 vs 320000); Array -> 0
	(300000 each, lower index)."

	| leaves timings memory timeOnly plan oc |
	leaves := self leaves: {Set new -> 1. Bag new -> 1. Array new -> 1. OrderedCollection new -> 1}.
	oc := self nameOf: OrderedCollection new.
	timings := Dictionary new.
	timings at: (self nameOf: Set new) put: 100.
	timings at: (self nameOf: Bag new) put: 60.
	timings at: (self nameOf: Array new) put: 50.
	timings at: oc put: 40.
	memory := Dictionary new.
	memory at: (self nameOf: Set new) put: 1000.
	memory at: oc put: 1000.
	memory at: (self nameOf: Bag new) put: 0.
	memory at: (self nameOf: Array new) put: 0.
	timeOnly := GrailShardPlan workers: 2 leaves: leaves timings: timings reserveMs: 0.
	self assert: (timeOnly shardOf: (self nameOf: Set new)) = (timeOnly shardOf: oc).
	plan := GrailShardPlan workers: 2 leaves: leaves timings: timings memory: memory reserveMs: 0.
	self assert: (plan shardOf: oc) = 0.
	self assert: (plan shardOf: (self nameOf: Set new)) = 1.
	self assert: (plan shardOf: (self nameOf: Bag new)) = 0.
	self assert: (plan shardOf: (self nameOf: Array new)) = 0.
	self assert: (plan plannedKBOn: 0) = 1000.
	self assert: (plan plannedKBOn: 1) = 1000.
	self assert: (plan plannedMsOn: 0) = 150.
	self assert: (plan plannedMsOn: 1) = 100

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testMissingTimingsBalanceCounts [

	| plan |
	self assert: (GrailShardPlan readTimings: nil) isEmpty.
	self assert: (GrailShardPlan readTimings: '/nonexistent/grail/shard_timings.txt') isEmpty.
	plan := GrailShardPlan
		workers: 2
		leaves: (self leaves: {Set new -> 5. Bag new -> 3. Array new -> 2})
		timings: Dictionary new
		reserveMs: 99999.
	self deny: plan isTimed.
	"5 | 3 + 2, and the reserve is ignored when nothing is timed."
	self assert: (plan testCountOn: 0) = 5.
	self assert: (plan testCountOn: 1) = 5

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testNoMemoryIsTheTimeOnlyPlan [
	"Memory for no class in the suite -- no column, or only classes since
	removed -- must give the plan time alone gives: the same digest, so the
	same shards, and no memory planned.  Not the empty Dictionary twice: a
	table naming only a stranger is what reaches the guard, because every
	suite class would otherwise be costed at a mean of it."

	| leaves timings memory a b |
	leaves := GrailShardPlan leavesOf: PythonTestCase suite.
	timings := GrailShardPlan readTimings: GrailShardPlan defaultTimingsPath.
	memory := Dictionary new.
	memory at: 'NoSuchTestCase' put: 500000.
	a := GrailShardPlan workers: 8 leaves: leaves timings: timings reserveMs: 0.
	b := GrailShardPlan workers: 8 leaves: leaves timings: timings memory: memory reserveMs: 0.
	self assert: a digest = b digest.
	0 to: 7 do: [:i | self assert: (b plannedKBOn: i) = 0]

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testReadMemoryReadsTheThirdColumn [
	"'<ClassName> <ms> [<KB>]': the third column is optional, per line."

	| path file memory timings |
	path := self tmp: 'shard_timings_memory.txt'.
	file := GsFile openWriteOnServer: path.
	[file nextPutAll: '# comment 1 2'; lf;
		nextPutAll: 'Alpha 10 20'; lf;
		nextPutAll: 'Beta 30'; lf;
		nextPutAll: 'Gamma 40 lots'; lf;
		lf] ensure: [file close].
	[memory := GrailShardPlan readMemory: path.
	timings := GrailShardPlan readTimings: path]
		ensure: [GsFile removeServerFile: path].
	self assert: memory size = 1.
	self assert: (memory at: 'Alpha') = 20.
	self assert: timings size = 3.
	self assert: (timings at: 'Beta') = 30.
	self assert: (timings at: 'Gamma') = 40.
	self assert: (GrailShardPlan readMemory: nil) isEmpty

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testReserveLoadsShardZero [

	| timings plan |
	timings := Dictionary new.
	timings at: (self nameOf: Set new) put: 100.
	timings at: (self nameOf: Bag new) put: 100.
	plan := GrailShardPlan
		workers: 2
		leaves: (self leaves: {Set new -> 1. Bag new -> 1})
		timings: timings
		reserveMs: 150.
	self assert: (plan classesOn: 0) isEmpty.
	self assert: (plan plannedMsOn: 0) = 150.
	self assert: (plan plannedMsOn: 1) = 200

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testSuiteOrderWithinAShard [

	| leaves plan |
	leaves := self leaves: {Set new -> 1. Bag new -> 1. Array new -> 1}.
	plan := GrailShardPlan workers: 1 leaves: leaves timings: Dictionary new reserveMs: 0.
	self assert: (plan classesOn: 0) asArray
		= (leaves collect: [:each | self nameOf: each]) asArray

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testUnknownClassCostsMeanPerTest [
	"Set is timed at 1000 ms over 2 tests, so Bag, untimed with 4 tests, is
	planned at 2000 ms and placed first."

	| timings plan |
	timings := Dictionary new.
	timings at: (self nameOf: Set new) put: 1000.
	plan := GrailShardPlan
		workers: 2
		leaves: (self leaves: {Set new -> 2. Bag new -> 4})
		timings: timings
		reserveMs: 0.
	self assert: (plan shardOf: (self nameOf: Bag new)) = 0.
	self assert: (plan plannedMsOn: 0) = 2000.
	self assert: (plan shardOf: (self nameOf: Set new)) = 1

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testUntestedClassFallsBackToCharSum [
	"A class with no leaves (every test skipped) still has one owner, for its
	skip report."

	| plan |
	plan := GrailShardPlan workers: 4 leaves: #() timings: Dictionary new reserveMs: 0.
	self assert: (plan shardOf: 'NoSuchTestCase')
		= (GrailShardPlan charSumShardOf: 'NoSuchTestCase' workers: 4)

]
