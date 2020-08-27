! ------- Create dictionary if it is not present
run
| aSymbol names userProfile |
aSymbol := #'Benchmark'.
userProfile := System myUserProfile.
names := userProfile symbolList names.
(names includes: aSymbol) ifFalse: [
	| symbolDictionary |
	symbolDictionary := SymbolDictionary new name: aSymbol; yourself.
	userProfile insertDictionary: symbolDictionary at: names size + 1.
].
%
set compile_env: 0
! ------------------- Class definition for BenchmarkTestCase
expectvalue /Class
doit
TestCase subclass: 'BenchmarkTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Benchmark
  options: #()

%
expectvalue /Class
doit
BenchmarkTestCase category: 'SUnit-Kernel'
%
set compile_env: 0
! ------------------- Class definition for DictTestCase
expectvalue /Class
doit
BenchmarkTestCase subclass: 'DictTestCase'
  instVarNames: #( stdin)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Benchmark
  options: #()

%
expectvalue /Class
doit
DictTestCase comment: 
'No class-specific documentation for DictTestCase, hierarchy is: 
Object
  TestAsserter
    TestCase( testSelector)
      BenchmarkTestCase
        DictTestCase
'
%
expectvalue /Class
doit
DictTestCase category: 'SUnit-Kernel'
%
set compile_env: 0
! ------------------- Class definition for MatMulTestCase
expectvalue /Class
doit
BenchmarkTestCase subclass: 'MatMulTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Benchmark
  options: #()

%
expectvalue /Class
doit
MatMulTestCase category: 'SUnit-Kernel'
%
set compile_env: 0
! ------------------- Class definition for PiTestCase
expectvalue /Class
doit
BenchmarkTestCase subclass: 'PiTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Benchmark
  options: #()

%
expectvalue /Class
doit
PiTestCase category: 'SUnit-Kernel'
%

input BenchmarkTestCase.gs
input DictTestCase.gs
input MatMulTestCase.gs
input PiTestCase.gs
