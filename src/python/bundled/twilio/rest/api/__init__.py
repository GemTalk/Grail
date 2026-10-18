r"""
    Twilio - Api domain.

    GRAIL NOTE: trimmed from the twilio 9.10.9 source drop.  Upstream
    eagerly imports every Account sub-resource list (~30 modules,
    ~4MB of generated code) for deprecated convenience properties on
    the domain.  Grail vendors only the Messages path for now, so this
    file keeps the Api class surface that matters (account/accounts/
    messages) and omits the deprecated pass-through properties.
    Un-trimmed upstream behavior returns for each sub-resource as its
    module is vendored.
"""

from typing import Optional

from twilio.rest.api.ApiBase import ApiBase
from twilio.rest.api.v2010.account import AccountContext, AccountList
from twilio.rest.api.v2010.account.message import MessageList


class Api(ApiBase):
    @property
    def account(self) -> AccountContext:
        return self.v2010.account

    @property
    def accounts(self) -> AccountList:
        return self.v2010.accounts

    @property
    def messages(self) -> MessageList:
        return self.account.messages

    def __repr__(self) -> str:
        return "<Twilio.Api>"
