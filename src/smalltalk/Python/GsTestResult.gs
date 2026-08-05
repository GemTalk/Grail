set compile_env: 0

category: 'Running'
method: GsTestResult
runCase: aTestCase
  "change error handling for Grail"
  | aPass |
  [ 
  aTestCase runCase.
  aPass := true.
  self passed add: aTestCase ]
    on: (Globals at: #Exception)
    do: [ :ex | 
      aPass ifNotNil: [ System waitForDebug ].
      ex class defaultHandlers size > 0
        ifTrue: [ ex pass ].
      (ex isKindOf: Break) ifTrue:[ ex pass ]. "let GCI or topaz handle ctl-c"
      (ex isKindOf: TestFailure)
        ifTrue: [ self addFailure: aTestCase ]
        ifFalse: [ self addError: aTestCase ].
      GsTestCase logCr: 'ERROR ' , ex number asString , '  ' , ex asString.
      (GsTestCase isDebug: ex) 
        ifFalse: [ 
          GsTestCase
            logCr: '------------------------------(';
            logCr: (GsProcess stackReportToLevel: 300);
            "Uncomment this to get more output in SUnit.log:"
            "logCr: (GsProcess _fullStackReport );"
            logCr: '------------------------------)' ].
      self ]
%

category: 'Debugging'
classmethod: GsTestResult
defectLogFile
  "changed to allow multiple topaz -l /gem  to write to same directory."
  ^ SessionTemps current at: #GsTestResultDefectsLog
    ifAbsentPut: [ 
      | f path separator |
      path := self defectLogFilePath ifNil: [ GsFile serverCurrentDirectory ].
      separator := (path endsWith: '/') ifTrue: [ '' ] ifFalse: [ '/' ].
      path := path , separator , 'SUnitDefects', System gemProcessId asString,'.log' .
      f := GsFile openAppendOnServer: path .
      f ifNil: [ Error signal: 'open failed' , GsFile serverErrorString ].
      f ]
%

