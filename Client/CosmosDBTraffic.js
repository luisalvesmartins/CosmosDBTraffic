var CosmosDBTraffic={
    APIHOST:"http://localhost:7071/api/",
    graphHeight:50,
    DIVCALLOUT:'_divCosmosCallOut',
    DIVDETAIL:'_divCosmosTraffic',
    tog:function(){
        CosmosDBTraffic.div.style.display= (CosmosDBTraffic.div.style.display=="block") ? "none":"block";
        if (CosmosDBTraffic.div.style.display=="block")
            CosmosDBTraffic.drawGraph();
    },
    init:function(HostURL){
        if (HostURL!=null)
            CosmosDBTraffic.APIHOST=HostURL;
        CosmosDBTraffic.data=[];
        CosmosDBTraffic.max=[0,0,0,0];
        CosmosDBTraffic.vis=[true,true,true,true];
        CosmosDBTraffic.cols=['Time(s)','RUs','Records','Size(bytes)'];
    
        if (!document.getElementById(CosmosDBTraffic.DIVCALLOUT))
        {
            var elem=document.createElement("div");
            elem.id=CosmosDBTraffic.DIVCALLOUT;
            elem.innerHTML="Cosmos Traffic";
            elem.className="CosmosCallOut";
            document.body.appendChild(elem);
        }
        if (!document.getElementById(CosmosDBTraffic.DIVDETAIL))
        {
            var elem=document.createElement("div");
            elem.id=CosmosDBTraffic.DIVDETAIL;
            elem.className="CosmosTraffic";
            elem.innerHTML='<div id="' + CosmosDBTraffic.DIVDETAIL + 'Menu" class="CosmosTrafficMenu"></div><div id="' + CosmosDBTraffic.DIVDETAIL + 'Graph" class="CosmosTrafficGraph"></div>';
            document.body.appendChild(elem);
        }
        document.getElementById(CosmosDBTraffic.DIVCALLOUT).addEventListener("click",CosmosDBTraffic.tog);
        CosmosDBTraffic.divCallOut=document.getElementById(CosmosDBTraffic.DIVCALLOUT);
        CosmosDBTraffic.div=document.getElementById(CosmosDBTraffic.DIVDETAIL);
        CosmosDBTraffic.htmlGraph=document.getElementById(CosmosDBTraffic.DIVDETAIL+"Graph");
        CosmosDBTraffic.htmlMenu=document.getElementById(CosmosDBTraffic.DIVDETAIL+"Menu");
        CosmosDBTraffic.max=[0,0,0,0];
        CosmosDBTraffic.vis=[true,true,true,true];
        CosmosDBTraffic.htmlGraph.style.height=CosmosDBTraffic.graphHeight + "px";
        CosmosDBTraffic.htmlMenu.innerHTML=`<div title="Time in seconds" class=CosmosTrafficCol1 onclick=CosmosDBTraffic.menu(this,0)>T</div><div title="Number of RUs" class=CosmosTrafficCol2 onclick=CosmosDBTraffic.menu(this,1)>RU</div><div title="Number of Records" class=CosmosTrafficCol3 onclick=CosmosDBTraffic.menu(this,2)>RC</div><div title="Total in bytes" class=CosmosTrafficCol4 onclick=CosmosDBTraffic.menu(this,3)>LN</div>`;

        CosmosDBTraffic.drawGraph();
    },
    menu:function(t,op){
        CosmosDBTraffic.vis[op]=!CosmosDBTraffic.vis[op];
        t.className= (CosmosDBTraffic.vis[op]) ? "CosmosTrafficCol" + (op+1) : "CosmosTrafficCol0";
        CosmosDBTraffic.drawGraph();
    },
    add:function(rec){
    //time,RU,NREC,BYTES, comment, URL
        rec.push(new Date())
        var l=CosmosDBTraffic.data.push(rec);
        if (l>20)
            CosmosDBTraffic.data.splice(0,1);
        for(var i=0;i<rec.length;i++){
            if (rec[i]>CosmosDBTraffic.max[i])
                CosmosDBTraffic.max[i]=rec[i];
        }        
        CosmosDBTraffic.drawGraph();
    },
    drawGraph:function(){
        if (CosmosDBTraffic.htmlGraph && CosmosDBTraffic.data.length>0){
            var s="";
            var tw=0;
            for(var j=0;j<CosmosDBTraffic.data.length;j++){
                var d=CosmosDBTraffic.data[j];
                for(var i=0;i<d.length-1;i++){
                    if (CosmosDBTraffic.vis[i]){
                        var v=d[i]/CosmosDBTraffic.max[i]*CosmosDBTraffic.graphHeight;
                        if (v<1 && d[i]>0)
                            v=1;
                        s+='<div onclick="console.log(CosmosDBTraffic.data[' + j + '][5]);" class="CosmosTrafficCol' + (i+1) + '" title="' + CosmosDBTraffic.cols[i] +"\n" + d[i] + "\n" + d[4] +'" style="height:' + v + 'px;"></div>';
                        tw+=10;
                    }
                }
                s+='<div class=CosmosTrafficSeparator style="width:1px;height:' + CosmosDBTraffic.graphHeight + 'px;"></div>';
                tw+=5;
            }
            CosmosDBTraffic.htmlGraph.innerHTML=s;
            CosmosDBTraffic.div.style.width=tw + "px";
        }
    },
    query:async function(database, collection, query, message){
        var t0=new Date();
        try {
            var result = await $.post({
                url: CosmosDBTraffic.APIHOST + "query?db=" + database + "&col=" + collection,
                type:"POST",
                data:query,
                contentType: "application/json; charset=utf-8",
            });
        } catch (error) {
            console.log("!!! ERROR ON " + message)
            console.log(query)
            console.log(error)
            return [];
        }
        CosmosDBTraffic.add([(new Date()-t0)/1000,result.ru,result.nr,result.lb,message, CosmosDBTraffic.APIHOST + "query?db=" + database + "&col=" + collection]);
        return result.data;
    },
    upsert:async function(database, collection, record, partitionKeyValue, message){
        var t0=new Date();
        try {
            var result = await $.post({
                url: CosmosDBTraffic.APIHOST + "upsert?db=" + database + "&col=" + collection + "&partitionKeyValue=" + partitionKeyValue,
                type:"POST",
                data:record,
                contentType: "application/json; charset=utf-8",
            });
        } catch (error) {
            console.log("!!! ERROR ON " + message)
            console.log(record)
            console.log(error)
            return [];
        }
        CosmosDBTraffic.add([(new Date()-t0)/1000,result.ru,result.nr,result.lb,message, CosmosDBTraffic.APIHOST + "upsert?db=" + database + "&col=" + collection + "&partitionKeyValue=" + partitionKeyValue]);
        return result.data;
    },
    delete:async function(database, collection, id, partitionKeyValue, message){
        var t0=new Date();
        try {
            var result = await $.get({
                url: CosmosDBTraffic.APIHOST + "delete?db=" + database + "&col=" + collection + "&partitionKeyValue=" + partitionKeyValue + "&id=" + id,
            });
        } catch (error) {
            console.log("!!! ERROR ON " + message)
            console.log(id)
            console.log(error)
            return [];
        }
        //result=JSON.parse(result);

        CosmosDBTraffic.add([(new Date()-t0)/1000,result.ru,result.nr,result.lb,message, CosmosDBTraffic.APIHOST + "delete?db=" + database + "&col=" + collection + "&partitionKeyValue=" + partitionKeyValue + "&id=" + id]);
        return result.data;
    }
}