// CMD Hosting: Nitrado-style rental durations without automatic destruction.
// No payment is accepted or claimed here; only a trusted billing backend may activate/renew.
export const RENTAL_PERIODS=Object.freeze([3,30,90,365]);
export const RETENTION_POLICY='until-owner-explicit-deletion';
export function validateRentalPeriod(days){
 if(!Number.isInteger(days)||!RENTAL_PERIODS.includes(days))
  throw Error('Durée de location invalide : 3, 30, 90 ou 365 jours.');
 return days;
}
export function rentalStatus(rental,now=new Date()){
 if(!rental)return {state:'not-configured',canRun:false,retained:true,autoDelete:false};
 if(!rental.paidUntil)return {state:'awaiting-payment',canRun:false,retained:true,autoDelete:false};
 const until=new Date(rental.paidUntil);
 if(!Number.isFinite(until.getTime()))throw Error('Date de paiement corrompue ; accès bloqué sans suppression.');
 const active=until.getTime()>new Date(now).getTime();
 return {state:active?'active':'suspended-expired',canRun:active,retained:true,autoDelete:false,
  paidUntil:until.toISOString(),expired:!active};
}
export function configureRental(existing,periodDays){
 validateRentalPeriod(periodDays);
 return {...existing,periodDays,autoDelete:false,retention:RETENTION_POLICY,
  state:existing?.paidUntil?'payment-state-kept':'awaiting-payment'};
}
// Call ONLY from verified payment processor logic. Never expose to untrusted client POST.
export function extendAfterVerifiedPayment(rental,{periodDays,paymentReference,verifiedBy},now=new Date()){
 validateRentalPeriod(periodDays);
 if(!/^[-A-Za-z0-9_:]{8,160}$/.test(String(paymentReference||'')))
  throw Error('Référence de paiement vérifiée requise.');
 if(verifiedBy!=='trusted-billing-backend')
  throw Error('Un navigateur ou un client ne peut pas valider son propre paiement.');
 const base=Math.max(new Date(now).getTime(),rental?.paidUntil?new Date(rental.paidUntil).getTime():0);
 if(!Number.isFinite(base))throw Error('Date de renouvellement invalide.');
 return {...configureRental(rental,periodDays),paidUntil:new Date(base+periodDays*86400000).toISOString(),
  lastVerifiedPaymentReference:paymentReference,state:'active',autoDelete:false};
}
