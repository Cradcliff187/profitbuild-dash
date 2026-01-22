/**
 * Query QuickBooks Sandbox Schema
 * This script fetches comprehensive schema information from QuickBooks
 */

const REALM_ID = '9341456092071018';
const ACCESS_TOKEN = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwieC5vcmciOiJIMCJ9..vITEZcpxlxZvRLHkkyTl8A.TiucClWw4vJEZ-GMV7VmMRKArea6AFrrkTs2XJr_an0gZk3A1wElJK1hnZsDnv_UKx3OGkFyI1eiV0CxfzLHomr63vMtv9Rc_L4KIsnhzo5icWwCFpJ1MaQzctigj8Yfx9CwoHer0ht4TLjBAwwf-iMnPLxFlExHrJqH6FoSDGF0vaY0aoPvQKgYvkUQrQshKLD3xv8w6rmI69ldMj2j1udmQWBZYEq2Wi6jQ0iYQBuampT9Lxr6H6LTe1HEdbxAruFsYxUHGz4kz8E4Hemygz35KVcTfVRZsNd8arm1tV5sfa2crpuQpVk61ImrWUa6Krdn8yr3leP_mI-kaF-1od3C3LAtpIDEu_gMol-_Te-Uc0nZzroC077X7YMJePylV0iwHXhQBrKFgutaGIWfuqyPvAWw4gxaDY4oZIbCKYo-AasN97NXWHSsVcsSqEx_4B1stHRfO54KJaBrMuaqbDT9GR5YbLS61MbAjeZyPgw.v80uOFggMkIJfLjDS4OtiA';
const BASE_URL = 'https://sandbox-quickbooks.api.intuit.com';

interface QueryResult {
  category: string;
  count: number;
  data: any[];
}

async function queryQuickBooks(query: string): Promise<any> {
  const url = `${BASE_URL}/v3/company/${REALM_ID}/query?query=${encodeURIComponent(query)}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`QuickBooks API error: ${response.status} ${await response.text()}`);
  }
  
  return await response.json();
}

async function getEntity(entityType: string): Promise<any> {
  const url = `${BASE_URL}/v3/company/${REALM_ID}/${entityType.toLowerCase()}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    return null;
  }
  
  return await response.json();
}

async function main() {
  console.log('🔍 Querying QuickBooks Sandbox Schema...\n');
  console.log('Company: Sandbox Company_US_1');
  console.log('Realm ID:', REALM_ID);
  console.log('Environment: Sandbox\n');
  console.log('='.repeat(80));
  
  const results: QueryResult[] = [];
  
  // 1. Query Accounts (ALL types)
  try {
    console.log('\n📊 ACCOUNTS (Chart of Accounts)');
    console.log('='.repeat(80));
    const accountsData = await queryQuickBooks('SELECT * FROM Account MAXRESULTS 1000');
    const accounts = accountsData?.QueryResponse?.Account || [];
    
    // Group by account type
    const accountsByType = accounts.reduce((acc: any, account: any) => {
      const type = account.AccountType || 'Unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(account);
      return acc;
    }, {});
    
    console.log(`\nTotal Accounts: ${accounts.length}\n`);
    
    for (const [type, typeAccounts] of Object.entries(accountsByType)) {
      console.log(`\n${type} (${(typeAccounts as any[]).length} accounts):`);
      console.log('-'.repeat(80));
      (typeAccounts as any[]).forEach((acc: any) => {
        const subAccount = acc.ParentRef ? `  └─ SubAccount of: ${acc.ParentRef.name}` : '';
        console.log(`  • ${acc.Name} (ID: ${acc.Id}) ${subAccount}`);
        if (acc.AccountSubType) {
          console.log(`    SubType: ${acc.AccountSubType}`);
        }
      });
    }
    
    results.push({
      category: 'Accounts',
      count: accounts.length,
      data: accounts,
    });
  } catch (error) {
    console.error('❌ Error fetching accounts:', error.message);
  }
  
  // 2. Query Vendors
  try {
    console.log('\n\n🏢 VENDORS');
    console.log('='.repeat(80));
    const vendorsData = await queryQuickBooks('SELECT * FROM Vendor WHERE Active = true MAXRESULTS 1000');
    const vendors = vendorsData?.QueryResponse?.Vendor || [];
    
    console.log(`\nTotal Active Vendors: ${vendors.length}\n`);
    vendors.slice(0, 20).forEach((vendor: any) => {
      console.log(`  • ${vendor.DisplayName} (ID: ${vendor.Id})`);
      if (vendor.CompanyName && vendor.CompanyName !== vendor.DisplayName) {
        console.log(`    Company: ${vendor.CompanyName}`);
      }
    });
    
    if (vendors.length > 20) {
      console.log(`  ... and ${vendors.length - 20} more vendors`);
    }
    
    results.push({
      category: 'Vendors',
      count: vendors.length,
      data: vendors,
    });
  } catch (error) {
    console.error('❌ Error fetching vendors:', error.message);
  }
  
  // 3. Query Purchase Transactions (to find custom fields)
  try {
    console.log('\n\n💳 PURCHASE TRANSACTIONS (Recent)');
    console.log('='.repeat(80));
    const purchasesData = await queryQuickBooks('SELECT * FROM Purchase MAXRESULTS 10');
    const purchases = purchasesData?.QueryResponse?.Purchase || [];
    
    console.log(`\nRecent Purchases: ${purchases.length}\n`);
    
    if (purchases.length > 0) {
      purchases.forEach((purchase: any, index: number) => {
        console.log(`\nPurchase #${index + 1}:`);
        console.log(`  ID: ${purchase.Id}`);
        console.log(`  Date: ${purchase.TxnDate}`);
        console.log(`  Amount: $${purchase.TotalAmt}`);
        console.log(`  Payment Type: ${purchase.PaymentType}`);
        
        if (purchase.AccountRef) {
          console.log(`  Payment Account: ${purchase.AccountRef.name} (ID: ${purchase.AccountRef.value})`);
        }
        
        if (purchase.EntityRef) {
          console.log(`  Vendor: ${purchase.EntityRef.name}`);
        }
        
        if (purchase.Line && purchase.Line[0]) {
          const line = purchase.Line[0];
          if (line.AccountBasedExpenseLineDetail?.AccountRef) {
            console.log(`  Expense Account: ${line.AccountBasedExpenseLineDetail.AccountRef.name}`);
          }
        }
        
        if (purchase.CustomField && purchase.CustomField.length > 0) {
          console.log(`  Custom Fields:`);
          purchase.CustomField.forEach((field: any) => {
            console.log(`    • ${field.Name} (ID: ${field.DefinitionId}): ${field.StringValue || field.Value || '(empty)'}`);
          });
        }
      });
    } else {
      console.log('No purchase transactions found.');
    }
    
    results.push({
      category: 'Purchase Transactions',
      count: purchases.length,
      data: purchases,
    });
  } catch (error) {
    console.error('❌ Error fetching purchases:', error.message);
  }
  
  // 4. Query Preferences (for custom field definitions)
  try {
    console.log('\n\n⚙️ PREFERENCES & CUSTOM FIELDS');
    console.log('='.repeat(80));
    const prefUrl = `${BASE_URL}/v3/company/${REALM_ID}/preferences`;
    const prefResponse = await fetch(prefUrl, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Accept': 'application/json',
      },
    });
    
    if (prefResponse.ok) {
      const prefData = await prefResponse.json();
      console.log('\n✅ Preferences data retrieved');
      
      // Look for custom fields
      const salesPrefs = prefData?.Preferences?.SalesFormsPrefs;
      if (salesPrefs?.CustomField) {
        console.log('\nCustom Fields Found:');
        console.log('-'.repeat(80));
        salesPrefs.CustomField.forEach((field: any) => {
          console.log(`  • ${field.Name}`);
          if (field.CustomField) {
            field.CustomField.forEach((cf: any) => {
              console.log(`    Definition ID: ${cf.DefinitionId}`);
              console.log(`    Type: ${cf.Type}`);
            });
          }
        });
      } else {
        console.log('\n⚠️ No custom fields found in SalesFormsPrefs');
      }
      
      // Show other relevant preferences
      console.log('\n\nOther Preferences:');
      console.log('-'.repeat(80));
      console.log(`  Currency: ${prefData?.Preferences?.CurrencyPrefs?.HomeCurrency?.value || 'N/A'}`);
      console.log(`  Company Type: ${prefData?.Preferences?.CompanyPrefs?.OrganizationType || 'N/A'}`);
    } else {
      console.log('⚠️ Could not fetch preferences');
    }
  } catch (error) {
    console.error('❌ Error fetching preferences:', error.message);
  }
  
  // 5. Query Customers (for reference)
  try {
    console.log('\n\n👥 CUSTOMERS (Top 20)');
    console.log('='.repeat(80));
    const customersData = await queryQuickBooks('SELECT * FROM Customer WHERE Active = true MAXRESULTS 20');
    const customers = customersData?.QueryResponse?.Customer || [];
    
    console.log(`\nTotal Active Customers (showing first 20): ${customers.length}\n`);
    customers.forEach((customer: any) => {
      console.log(`  • ${customer.DisplayName} (ID: ${customer.Id})`);
    });
    
    results.push({
      category: 'Customers',
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    console.error('❌ Error fetching customers:', error.message);
  }
  
  // 6. Query Classes (if used)
  try {
    console.log('\n\n📁 CLASSES');
    console.log('='.repeat(80));
    const classesData = await queryQuickBooks('SELECT * FROM Class MAXRESULTS 100');
    const classes = classesData?.QueryResponse?.Class || [];
    
    console.log(`\nTotal Classes: ${classes.length}\n`);
    if (classes.length > 0) {
      classes.forEach((cls: any) => {
        console.log(`  • ${cls.Name} (ID: ${cls.Id})`);
      });
    } else {
      console.log('No classes found.');
    }
    
    results.push({
      category: 'Classes',
      count: classes.length,
      data: classes,
    });
  } catch (error) {
    console.error('⚠️ Classes not available:', error.message);
  }
  
  // 7. Query Payment Methods
  try {
    console.log('\n\n💰 PAYMENT METHODS');
    console.log('='.repeat(80));
    const paymentMethodsData = await queryQuickBooks('SELECT * FROM PaymentMethod MAXRESULTS 100');
    const paymentMethods = paymentMethodsData?.QueryResponse?.PaymentMethod || [];
    
    console.log(`\nTotal Payment Methods: ${paymentMethods.length}\n`);
    paymentMethods.forEach((method: any) => {
      console.log(`  • ${method.Name} (ID: ${method.Id}) - Type: ${method.Type || 'N/A'}`);
    });
    
    results.push({
      category: 'Payment Methods',
      count: paymentMethods.length,
      data: paymentMethods,
    });
  } catch (error) {
    console.error('⚠️ Payment methods not available:', error.message);
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📋 SUMMARY');
  console.log('='.repeat(80));
  results.forEach(result => {
    console.log(`  • ${result.category}: ${result.count} items`);
  });
  
  console.log('\n✅ Schema query complete!');
  console.log('\n💾 Saving full results to quickbooks-schema.json...');
  
  // Save to file
  const fs = await import('fs');
  fs.writeFileSync(
    'quickbooks-schema.json',
    JSON.stringify({
      company: 'Sandbox Company_US_1',
      realm_id: REALM_ID,
      environment: 'sandbox',
      queried_at: new Date().toISOString(),
      results: results,
    }, null, 2)
  );
  
  console.log('✅ Saved to quickbooks-schema.json');
}

main().catch(console.error);
