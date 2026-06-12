import gemstone
import os 
import time

#you have to have a ./twilio_env.py file with the definition of variables
#account_sid and auth_token 
from twilio_env import account_sid,auth_token

to          = "+15098766685"
from_number = "+14155238886"

sent_sms_invoices = gemstone["sent_sms_invoices"]
acmeSystem = gemstone["InstalledAcmeSystem"]

while True:
    invoices = acmeSystem.invoices()

    not_send_sms_invoices = set(invoices) - set(sent_sms_invoices)
    for invoice in not_send_sms_invoices:
        invoice_number = invoice.number()
        body = f"Invoice {invoice_number} created"
        cmd = (
            f"curl -s -X POST "
            f"'https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json' "
            f"--data-urlencode 'To=whatsapp:{to}' "
            f"--data-urlencode 'From=whatsapp:{from_number}' "
            f"--data-urlencode 'Body={body}' "
            f"-u {account_sid}:{auth_token} > twilio_response.json"
        )
        sent_result = os.system(cmd)
        print(f"Sent: {body} - Sent result: {sent_result}")

    sent_sms_invoices.extend(not_send_sms_invoices)
    gemstone.system().commit()
    time.sleep(1)
