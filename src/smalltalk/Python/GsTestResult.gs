! installed as SystemUser   by the install scripts
category: 'Running'
method: GsTestResult
runCase: aTestCase
  "change error handling for Grail"
  | aPass |
  [ 
  aTestCase runCase.
  aPass := true.
  self passed add: aTestCase ]
    on: Exception
    do: [ :ex | 
      aPass ifNotNil: [ System waitForDebug ].
      ex class defaultHandlers size > 0
        ifTrue: [ ex pass ].
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

