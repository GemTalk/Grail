! ===============================================================================
! DispatchBenchmark — end-to-end benchmark for the dispatch model rewrite.
!
! Measures the full cost of Python calls through Grail's codegen pipeline,
! breaking down the components: receiver resolution, method dispatch,
! BoundMethod first-class calls, and the ProfClass baseline.
!
! Usage (requires install.sh to have been run first):
!     input benchmarks/ProfClass.gs
!     input benchmarks/DispatchBenchmark.gs
!     commit
!     run  DispatchBenchmark new test.  %
!
! See also: docs/Rewrite_Dispatch_Model.md (Follow-ups section).
! ===============================================================================

set compile_env: 0

expectvalue /Class
doit
Object subclass: 'DispatchBenchmark'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: UserGlobals
  options: #()

%
expectvalue /Class
doit
DispatchBenchmark category: 'Benchmarks'
%
removeallmethods DispatchBenchmark
removeallclassmethods DispatchBenchmark

category: 'running'
method: DispatchBenchmark
test
"
	DispatchBenchmark new test.
"
	| stream |
	stream := WriteStream on: String new.
	stream nextPutAll: 'Dispatch Benchmark (all times ns/call, 100M iterations)'; lf; lf.

	self benchmarkBaseline: stream.
	stream lf.
	self benchmarkPythonCalls: stream.
	stream lf.
	self benchmarkReceiverResolution: stream.
	stream lf.
	self benchmarkBoundMethod: stream.
	stream lf.
	self benchmarkProfClass: stream.

	^ stream contents
%

category: 'benchmarks'
method: DispatchBenchmark
benchmarkBaseline: stream
	| n t1 t2 |
	n := 100000000.
	stream nextPutAll: '--- Baseline ---'; lf.

	t1 := System timeNs. n timesRepeat: []. t2 := System timeNs.
	stream nextPutAll: 'empty loop:              '; nextPutAll: ((t2 - t1) / n) asFloat printString; lf.
%

category: 'benchmarks'
method: DispatchBenchmark
benchmarkPythonCalls: stream
	"Compile Python source once, then execute the compiled method N times.
	Isolates DISPATCH cost from PARSE+COMPILE cost."

	| n t1 t2 compiledMethod moduleScope symbolList s |
	n := 100000000.
	moduleScope := SymbolDictionary new.
	symbolList := System myUserProfile symbolList copy.
	symbolList insertObject: moduleScope at: 1.

	stream nextPutAll: '--- Python calls (compiled, executed via _executeInContext:) ---'; lf.

	"abs(-5): 1-arg fixed-arity builtin"
	s := PrettyWriteStream on: Unicode7 new.
	(ModuleAst parseSource: 'abs(-5)') printSmalltalkOn: s.
	compiledMethod := s contents _compileInContext: nil symbolList: symbolList oldLitVars: nil environmentId: 1 flags: 0.
	t1 := System timeNs.
	n timesRepeat: [ compiledMethod _executeInContext: nil ].
	t2 := System timeNs.
	stream nextPutAll: 'abs(-5) Python:          '; nextPutAll: ((t2 - t1) / n) asFloat printString; lf.

	"pow(2, 10): 2-arg fixed-arity builtin"
	s := PrettyWriteStream on: Unicode7 new.
	(ModuleAst parseSource: 'pow(2, 10)') printSmalltalkOn: s.
	compiledMethod := s contents _compileInContext: nil symbolList: symbolList oldLitVars: nil environmentId: 1 flags: 0.
	t1 := System timeNs.
	n timesRepeat: [ compiledMethod _executeInContext: nil ].
	t2 := System timeNs.
	stream nextPutAll: 'pow(2,10) Python:        '; nextPutAll: ((t2 - t1) / n) asFloat printString; lf.

	"len('hello'): 1-arg fixed-arity builtin"
	s := PrettyWriteStream on: Unicode7 new.
	(ModuleAst parseSource: 'len("hello")') printSmalltalkOn: s.
	compiledMethod := s contents _compileInContext: nil symbolList: symbolList oldLitVars: nil environmentId: 1 flags: 0.
	t1 := System timeNs.
	n timesRepeat: [ compiledMethod _executeInContext: nil ].
	t2 := System timeNs.
	stream nextPutAll: 'len("hello") Python:     '; nextPutAll: ((t2 - t1) / n) asFloat printString; lf.
%

category: 'benchmarks'
method: DispatchBenchmark
benchmarkReceiverResolution: stream
	"Break down the cost of resolving the builtins receiver chain:
	((Python @env0:at: #builtins) instance)."

	| n t1 t2 bi |
	n := 100000000.
	bi := builtins perform: #instance env: 1.

	stream nextPutAll: '--- Receiver resolution ---'; lf.

	t1 := System timeNs.
	n timesRepeat: [ Python @env0:at: #builtins ].
	t2 := System timeNs.
	stream nextPutAll: 'Python at: #builtins:    '; nextPutAll: ((t2 - t1) / n) asFloat printString; lf.

	t1 := System timeNs.
	n timesRepeat: [ builtins perform: #instance env: 1 ].
	t2 := System timeNs.
	stream nextPutAll: 'builtins instance:       '; nextPutAll: ((t2 - t1) / n) asFloat printString; lf.

	t1 := System timeNs.
	n timesRepeat: [ (Python @env0:at: #builtins) perform: #instance env: 1 ].
	t2 := System timeNs.
	stream nextPutAll: 'full receiver chain:     '; nextPutAll: ((t2 - t1) / n) asFloat printString; lf.

	t1 := System timeNs.
	n timesRepeat: [ bi perform: #'abs:' env: 1 withArguments: {5} ].
	t2 := System timeNs.
	stream nextPutAll: 'cached bi abs: 5:        '; nextPutAll: ((t2 - t1) / n) asFloat printString; lf.
%

category: 'benchmarks'
method: DispatchBenchmark
benchmarkBoundMethod: stream
	"Measure BoundMethod first-class function dispatch.
	f = abs; f(5) goes through BoundMethod >> value:value:."

	| n t1 t2 bi bm |
	n := 100000000.
	bi := builtins perform: #instance env: 1.
	bm := BoundMethod perform: #'receiver:selector:' env: 1 withArguments: {bi . #abs}.

	stream nextPutAll: '--- BoundMethod (f = abs; f(5)) ---'; lf.

	t1 := System timeNs.
	n timesRepeat: [ bm @env0:_selectorForArgCount: 1 ].
	t2 := System timeNs.
	stream nextPutAll: 'selector lookup (1):     '; nextPutAll: ((t2 - t1) / n) asFloat printString; lf.

	t1 := System timeNs.
	n timesRepeat: [ bm @env0:_receiverHasSelector: #'abs:' ].
	t2 := System timeNs.
	stream nextPutAll: 'hasSelector check:       '; nextPutAll: ((t2 - t1) / n) asFloat printString; lf.

	t1 := System timeNs.
	n timesRepeat: [ bm perform: #'value:value:' env: 1 withArguments: {{5} . nil} ].
	t2 := System timeNs.
	stream nextPutAll: 'BoundMethod abs(5):      '; nextPutAll: ((t2 - t1) / n) asFloat printString; lf.
%

category: 'benchmarks'
method: DispatchBenchmark
benchmarkProfClass: stream
	"ProfClass abs1: baseline — raw method dispatch + body, no receiver
	resolution overhead. This is the dispatch floor the rewrite targets."

	| n t1 t2 pc |
	n := 100000000.
	pc := ProfClass new.

	stream nextPutAll: '--- ProfClass baseline ---'; lf.

	t1 := System timeNs.
	n timesRepeat: [ pc abs1: 3 ].
	t2 := System timeNs.
	stream nextPutAll: 'ProfClass abs1: 3:       '; nextPutAll: ((t2 - t1) / n) asFloat printString; lf.
%
