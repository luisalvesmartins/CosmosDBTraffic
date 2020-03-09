using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Linq;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;
using Microsoft.Azure.Cosmos;

namespace ProxyToCosmosDB
{
    public static class CosmosDBProxy
    {
        // AZURE FUNCTIONS
        // ENDPOINTS: UPSERT, QUERY, DELETE

        [FunctionName("upsert")]
        public static async Task<IActionResult> Upsert(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            Container container = InitializeClientAndGetContainer(req);

            //PARAMETERS
            string partitionKeyValue = req.Query["partitionKeyValue"];
            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            dynamic inputDoc = JsonConvert.DeserializeObject(requestBody);

            PartitionKey PK = new PartitionKey(partitionKeyValue);
            ItemResponse<dynamic> response = await container.UpsertItemAsync<dynamic>(inputDoc,PK);

            QResult R = new QResult() { RU = response.RequestCharge, NR = 1, LB = 0, Data = response.StatusCode };
            return (ActionResult)new OkObjectResult(R);
        }

        [FunctionName("delete")]
        public static async Task<IActionResult> Delete(
            [HttpTrigger(AuthorizationLevel.Anonymous,"get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            Container container = InitializeClientAndGetContainer(req);

            //PARAMETERS
            string partitionKeyValue = req.Query["partitionKeyValue"];
            string id = req.Query["id"];

            if (id != null)
            {
                log.LogInformation("DELETING " + id);
                ItemResponse<dynamic> response=await container.DeleteItemAsync<dynamic>(id, new PartitionKey(partitionKeyValue));
                QResult R = new QResult() { RU = response.RequestCharge, NR = 1, LB = 0, Data = response.StatusCode };
                return (ActionResult)new OkObjectResult(R);
            }
            return (ActionResult)new OkObjectResult(false);
        }

        [FunctionName("query")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            Container container = InitializeClientAndGetContainer(req);

            //PARAMETERS
            string QUERY = req.Query["query"];
            //If post get the query from the body
            if (req.Method == "POST")
            {
                QUERY = await new StreamReader(req.Body).ReadToEndAsync();
            }

            log.LogInformation("QUERY:" + QUERY);

            QueryDefinition query = new QueryDefinition(QUERY);
            FeedIterator<dynamic> resultSet = container.GetItemQueryIterator<dynamic>(
                query,
                requestOptions: new QueryRequestOptions()
                {
                    MaxItemCount = -1
                });

            List<dynamic> L = new List<dynamic>();
            double t = 0;
            while (resultSet.HasMoreResults)
            {
                FeedResponse<dynamic> response = await resultSet.ReadNextAsync();
                t += response.RequestCharge;
                L = L.Concat(response).ToList();
            }

            QResult R = new QResult() { RU = t, NR = L.Count, LB = JsonConvert.SerializeObject(L).Length, Data = L };
            return (ActionResult)new OkObjectResult(R);
        }

        private static Container InitializeClientAndGetContainer(HttpRequest req)
        {
            //CONFIG
            var config = new ConfigurationBuilder()
             .AddJsonFile("local.settings.json", optional: true, reloadOnChange: true)
             .AddEnvironmentVariables()
             .Build();
            string URL = config["URL"];
            string KEY = config["KEY"];

            string databaseName = req.Query["db"];
            string collection = req.Query["col"];

            CosmosClient CC = new CosmosClient(URL, KEY);

            Database database = CC.GetDatabase(databaseName);
            Container container = database.GetContainer(collection);

            return container;
        }
    }

    //Return Format
    public class QResult
    {
        public double RU { get; set; }
        public long NR { get; set; }
        public long LB { get; set; }
        public object Data { get; set; }
    }
}
