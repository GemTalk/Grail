"
How the SUnit gate splits the PythonTestCase suite into GRAIL_TEST_WORKERS
shards (tests/scripts/runTestsShard.gs, scripts/run_tests.sh).

A plan places every test CLASS on exactly one shard, by measured cost: a greedy
longest-processing-time assignment over the per-class times in
tests/scripts/shard_timings.txt.  Classes are taken most expensive first and
each goes to the shard with the least planned time so far (ties: the lower
index).  A class the file does not name -- a new test class -- is estimated at
the file's mean cost per test times its test count, so new classes spread by
count and nothing is ever dropped.  With no file at all every class costs its
test count, which balances counts.

Whole classes, never single tests: a class's tests keep their order and any
state they share, and a framework's tests compile its imports once, on one
shard.  Within a shard the tests still run in suite order.

DETERMINISTIC, because the shards never communicate: every worker builds the
same plan from the same suite, the same file and the same reserve, and runs
only its own part.  #digest summarises the assignment so the shards' logs can
be compared (run_tests.sh does, when it runs them all).

A reserve (GRAIL_TEST_SHARD0_RESERVE_S) starts shard 0 with that much planned
time, for a runner that does other work besides its shard -- in CI shard 0's
job also runs the suites run_tests.sh runs after the shards.

GrailShardPlanTestCase checks the coverage invariant on the real suite: the
shards' union is the whole suite, with no test twice.
"
Class {
	#name : 'GrailShardPlan',
	#superclass : 'Object',
	#instVars : [
		'workers',
		'assignment',
		'loads',
		'counts',
		'order',
		'suiteSize',
		'timed'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan class >> charSumShardOf: aClassName workers: n [
	"The partition used before plans existed, kept for a class that has no
	tests in the suite at all (every test skipped on this gem), so its skips
	are still reported by exactly one shard."

	| sum |
	sum := 0.
	aClassName do: [:ch | sum := sum + ch asInteger].
	^ sum \\ n

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan class >> defaultTimingsPath [
	"tests/scripts/shard_timings.txt in the checkout, or nil when the checkout
	cannot be found (the plan then balances counts)."

	| dir |
	dir := System gemEnvironmentVariable: 'GRAIL_DIR'.
	(dir isNil or: [dir isEmpty]) ifTrue: [dir := importlib grailDir].
	dir isNil ifTrue: [^ nil].
	^ dir , '/tests/scripts/shard_timings.txt'

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan class >> forWorkers: n [
	"The plan the gate uses: the whole PythonTestCase suite, the committed
	timings file and the reserve from the environment."

	^ self
		workers: n
		leaves: (self leavesOf: PythonTestCase suite)
		timings: (self readTimings: self defaultTimingsPath)
		reserveMs: self reserveMsFromEnvironment

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan class >> leavesOf: aSuite [
	"The suite's TestCase instances in suite order (pre-order DFS): the order
	every shard runs its own tests in."

	| leaves flatten |
	leaves := OrderedCollection new.
	flatten := nil.
	flatten := [:node |
		(node isKindOf: TestSuite)
			ifTrue: [node tests do: [:each | flatten value: each]]
			ifFalse: [leaves add: node]].
	flatten value: aSuite.
	^ leaves

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan class >> readTimings: aPath [
	"Class name -> milliseconds, from lines '<ClassName> <ms>'.  Blank lines
	and '#' comments are skipped, and so is any line that does not parse.  A
	missing file answers an empty Dictionary."

	| timings file line |
	timings := Dictionary new.
	aPath isNil ifTrue: [^ timings].
	file := [GsFile openReadOnServer: aPath] on: Error do: [:ex | ex return: nil].
	file isNil ifTrue: [^ timings].
	[[(line := file nextLine) isNil] whileFalse: [
		| parts ms |
		line := line trimSeparators.
		(line isEmpty or: [(line at: 1) == $#]) ifFalse: [
			parts := line subStrings: ' '.
			parts size >= 2 ifTrue: [
				ms := [(parts at: 2) asNumber] on: Error do: [:ex | ex return: nil].
				(ms notNil and: [ms >= 0])
					ifTrue: [timings at: (parts at: 1) asString put: ms rounded]]]]]
		ensure: [file close].
	^ timings

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan class >> reserveMsFromEnvironment [
	"GRAIL_TEST_SHARD0_RESERVE_S, in milliseconds; 0 when unset or unreadable."

	| raw n |
	raw := System gemEnvironmentVariable: 'GRAIL_TEST_SHARD0_RESERVE_S'.
	(raw isNil or: [raw isEmpty]) ifTrue: [^ 0].
	n := [raw asNumber] on: Error do: [:ex | ex return: nil].
	(n isNil or: [n < 0]) ifTrue: [^ 0].
	^ (n * 1000) rounded

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan class >> workers: n leaves: aCollection timings: aDictionary reserveMs: reserveMs [

	^ self new initWorkers: n leaves: aCollection timings: aDictionary reserveMs: reserveMs

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan >> classesOn: anIndex [
	"The class names placed on shard anIndex, in suite order."

	^ order select: [:each | (assignment at: each) = anIndex]

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan >> digest [
	"A checksum of the whole assignment.  Every shard prints it; two shards
	that print different digests did not run the same partition, and some test
	may have run twice or not at all."

	| d |
	d := 0.
	(assignment keys asSortedCollection: [:a :b | a <= b]) do: [:each |
		(each , '=' , (assignment at: each) printString , ';') do: [:ch |
			d := (d * 31 + ch asInteger) \\ 1000000007]].
	^ d

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan >> initWorkers: n leaves: aCollection timings: aDictionary reserveMs: reserveMs [
	"Longest processing time first.  The sort is total (cost, then name), and
	ties between shards go to the lower index, so the result depends on
	nothing but the inputs."

	| known knownTests knownMs perTest costs sorted |
	workers := (n isNil or: [n < 1]) ifTrue: [1] ifFalse: [n].
	counts := Dictionary new.
	order := OrderedCollection new.
	aCollection do: [:each | | key |
		key := each class name asString.
		(counts includesKey: key) ifFalse: [order add: key. counts at: key put: 0].
		counts at: key put: (counts at: key) + 1].
	suiteSize := aCollection size.
	known := order select: [:each | aDictionary includesKey: each].
	timed := known notEmpty.
	knownTests := 0.
	knownMs := 0.
	known do: [:each |
		knownTests := knownTests + (counts at: each).
		knownMs := knownMs + (aDictionary at: each)].
	perTest := knownTests = 0 ifTrue: [1] ifFalse: [knownMs / knownTests].
	costs := Dictionary new.
	order do: [:each |
		costs at: each put: (aDictionary at: each ifAbsent: [((counts at: each) * perTest) rounded])].
	loads := Array new: workers withAll: 0.
	(timed and: [reserveMs notNil and: [reserveMs > 0]])
		ifTrue: [loads at: 1 put: reserveMs].
	assignment := Dictionary new.
	sorted := order asSortedCollection: [:a :b |
		(costs at: a) > (costs at: b)
			or: [(costs at: a) = (costs at: b) and: [a <= b]]].
	sorted do: [:each | | best |
		best := 1.
		2 to: workers do: [:i | (loads at: i) < (loads at: best) ifTrue: [best := i]].
		loads at: best put: (loads at: best) + (costs at: each).
		assignment at: each put: best - 1]

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan >> isTimed [
	"Whether any class's cost came from the timings file, rather than every
	class being costed by its test count."

	^ timed

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan >> plannedMsOn: anIndex [
	"The planned time of shard anIndex, reserve included."

	^ loads at: anIndex + 1

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan >> shardOf: aClassName [
	"The shard that owns aClassName.  A class with no tests in the suite falls
	back to the old char-sum partition, which is still one shard per class."

	^ assignment
		at: aClassName asString
		ifAbsent: [self class charSumShardOf: aClassName asString workers: workers]

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan >> suiteSize [
	"How many tests the whole suite holds, across every shard."

	^ suiteSize

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan >> testCountOn: anIndex [

	^ (self classesOn: anIndex) inject: 0 into: [:sum :each | sum + (counts at: each)]

]

{ #category : 'Grail-SUnit-Sharding' }
GrailShardPlan >> workers [

	^ workers

]
